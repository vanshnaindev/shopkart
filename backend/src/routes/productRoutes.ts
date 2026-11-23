import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../db.ts';
import { AuthRequest, requireAdmin } from '../middleware/auth.ts';
import { validate } from '../middleware/validation.ts';

const router = Router();

const createProductSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required.'),
  price: z.number().positive('Valid positive price is required.'),
  category: z.string().trim().min(1, 'Category is required.'),
  originalPrice: z.number().optional(),
  brand: z.string().optional(),
  stock: z.number().int().min(0, 'Stock cannot be negative.').optional(),
  description: z.string().optional(),
  images: z.array(z.string()).optional(),
  specifications: z.array(z.any()).optional(),
});

const updateProductSchema = z.object({
  name: z.string().trim().min(1).optional(),
  price: z.number().positive().optional(),
  category: z.string().trim().min(1).optional(),
  originalPrice: z.number().optional(),
  brand: z.string().optional(),
  stock: z.number().int().min(0).optional(),
  description: z.string().optional(),
  images: z.array(z.string()).optional(),
  specifications: z.array(z.any()).optional(),
  isActive: z.boolean().optional(),
});

const bulkImportSchema = z.object({
  products: z.array(z.any()).min(1, 'Array of products is required for bulk import.'),
});

// Get products with full filtering, sorting, and pagination
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      category,
      brand,
      search,
      minPrice,
      maxPrice,
      minRating,
      sort,
      page = '1',
      limit = '12',
      featured,
      bestSeller,
      deals,
      activeOnly,
    } = req.query as { [key: string]: string | undefined };

    const items = await db.products.find({
      category,
      brand,
      search,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      minRating: minRating ? parseFloat(minRating) : undefined,
      featured: featured === 'true',
      bestSeller: bestSeller === 'true',
      deals: deals === 'true',
      activeOnly: activeOnly === 'false' ? false : true,
    });

    // Sorting
    switch (sort) {
      case 'price-low-high':
      case 'price_asc':
        items.sort((a, b) => a.price - b.price);
        break;
      case 'price-high-low':
      case 'price_desc':
        items.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        items.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
        break;
      case 'newest':
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'popularity':
      default:
        items.sort((a, b) => (b.numReviews || 0) - (a.numReviews || 0));
        break;
    }

    const total = items.length;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 12);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedItems = items.slice(startIndex, startIndex + limitNum);

    // Extract dynamic facet brands for easy filtering
    const allProds = await db.products.find();
    const allBrands = Array.from(new Set(allProds.map((p) => p.brand))).filter(Boolean);

    res.json({
      success: true,
      products: paginatedItems,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      brands: allBrands,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Single product details
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const product = await db.products.findById(req.params.id);
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found.' });
      return;
    }

    const reviews = await db.reviews.findByProductId(product._id);
    const catProds = await db.products.find({ category: product.category, activeOnly: true });
    const relatedProducts = catProds.filter((p) => p._id !== product._id).slice(0, 4);

    res.json({
      success: true,
      product,
      reviews,
      relatedProducts,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Create product
router.post(
  '/',
  requireAdmin,
  validate({ body: createProductSchema }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        name,
        price,
        originalPrice,
        brand,
        category,
        stock,
        description,
        images,
        specifications,
      } = req.body;
      if (!name || !name.trim()) {
        res.status(400).json({ success: false, message: 'Product name is required.' });
        return;
      }
      const numPrice = Number(price);
      if (price === undefined || price === null || isNaN(numPrice) || numPrice <= 0) {
        res.status(400).json({ success: false, message: 'Valid positive price is required.' });
        return;
      }
      if (!category || !category.trim()) {
        res.status(400).json({ success: false, message: 'Category is required.' });
        return;
      }

      const newProd = await db.products.create({
        ...req.body,
        name: name.trim(),
        price: numPrice,
        originalPrice: Number(originalPrice || price),
        stock: Math.max(0, Number(stock ?? 10)),
        images:
          Array.isArray(images) && images.length > 0
            ? images
            : [
                'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
              ],
        specifications: Array.isArray(specifications) ? specifications : [],
      });

      res.status(201).json({
        success: true,
        message: 'Product created successfully.',
        product: newProd,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// Admin: Update product
router.put(
  '/:id',
  requireAdmin,
  validate({ body: updateProductSchema }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const updated = await db.products.update(req.params.id, req.body);
      if (!updated) {
        res.status(404).json({ success: false, message: 'Product not found.' });
        return;
      }

      res.json({
        success: true,
        message: 'Product updated successfully.',
        product: updated,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// Admin: Delete product (soft-delete if present in orders, hard-delete otherwise)
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const product = await db.products.findById(req.params.id);
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found.' });
      return;
    }

    const orders = await db.orders.find();
    const inOrders = orders.some((o) =>
      o.orderItems.some((item) => item.productId === product._id)
    );

    if (inOrders) {
      await db.products.update(product._id, { isActive: false });
      res.json({
        success: true,
        message: 'Product appears in existing orders; marked inactive (soft deleted).',
        softDeleted: true,
      });
      return;
    }

    const success = await db.products.delete(product._id);
    if (!success) {
      res.status(404).json({ success: false, message: 'Product not found.' });
      return;
    }
    res.json({ success: true, message: 'Product deleted successfully.', softDeleted: false });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Bulk Import (JSON array or parsed CSV records) with per-row validation
router.post(
  '/bulk-import',
  requireAdmin,
  validate({ body: bulkImportSchema }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { products } = req.body;
      if (!Array.isArray(products) || products.length === 0) {
        res
          .status(400)
          .json({ success: false, message: 'Array of products is required for bulk import.' });
        return;
      }

      const importedRows: any[] = [];
      const rejectedRows: { row: any; index: number; reason: string }[] = [];

      for (let index = 0; index < products.length; index++) {
        const item = products[index];
        if (!item || typeof item !== 'object') {
          rejectedRows.push({ row: item, index, reason: 'Invalid item data format' });
          continue;
        }
        if (!item.name || typeof item.name !== 'string' || !item.name.trim()) {
          rejectedRows.push({ row: item, index, reason: 'Product name is required.' });
          continue;
        }
        const price = Number(item.price);
        if (item.price === undefined || item.price === null || isNaN(price) || price <= 0) {
          rejectedRows.push({ row: item, index, reason: 'Valid positive price is required.' });
          continue;
        }
        if (!item.category || typeof item.category !== 'string' || !item.category.trim()) {
          rejectedRows.push({ row: item, index, reason: 'Category is required.' });
          continue;
        }
        const stock = item.stock !== undefined ? Number(item.stock) : 20;
        if (isNaN(stock) || stock < 0) {
          rejectedRows.push({ row: item, index, reason: 'Stock cannot be negative.' });
          continue;
        }

        const prod = await db.products.create({
          name: item.name.trim(),
          brand: item.brand?.trim() || 'Generic',
          category: item.category.trim(),
          price,
          originalPrice: Number(item.originalPrice || price),
          stock,
          description: item.description?.trim() || item.name.trim(),
          images: item.image
            ? [item.image]
            : Array.isArray(item.images) && item.images.length > 0
              ? item.images
              : undefined,
        });
        importedRows.push(prod);
      }

      res.json({
        success: true,
        message: `Successfully imported ${importedRows.length} products (${rejectedRows.length} rejected).`,
        imported: importedRows.length,
        rejected: rejectedRows.length,
        details: {
          importedRows,
          rejectedRows,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

export default router;
