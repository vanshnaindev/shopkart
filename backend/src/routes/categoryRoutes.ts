import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../db.ts';
import { AuthRequest, requireAdmin } from '../middleware/auth.ts';
import { validate } from '../middleware/validation.ts';

const router = Router();

const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required.'),
  description: z.string().optional(),
  image: z.string().optional(),
  isActive: z.boolean().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  isActive: z.boolean().optional(),
});

// Get all categories
router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const categories = await db.categories.find(false);
    res.json({
      success: true,
      categories,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Add category
router.post(
  '/',
  requireAdmin,
  validate({ body: createCategorySchema }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, description, image, isActive } = req.body;
      if (!name || !String(name).trim()) {
        res.status(400).json({ success: false, message: 'Category name is required.' });
        return;
      }

      const trimmedName = String(name).trim();
      const allCats = await db.categories.find(false);
      const existing = allCats.find((c) => c.name.toLowerCase() === trimmedName.toLowerCase());
      if (existing) {
        res
          .status(409)
          .json({ success: false, message: `Category "${trimmedName}" already exists.` });
        return;
      }

      const newCat = await db.categories.create({
        name: trimmedName,
        description,
        image,
        isActive: isActive !== false,
      });

      res.status(201).json({
        success: true,
        message: 'Category created successfully.',
        category: newCat,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// Admin: Update category
router.put(
  '/:id',
  requireAdmin,
  validate({ body: updateCategorySchema }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const category = await db.categories.findById(req.params.id);
      if (!category) {
        res.status(404).json({ success: false, message: 'Category not found.' });
        return;
      }

      const { name, description, image, isActive } = req.body;
      if (name !== undefined) {
        if (!name || !String(name).trim()) {
          res.status(400).json({ success: false, message: 'Category name cannot be empty.' });
          return;
        }
        const trimmedName = String(name).trim();
        const allCats = await db.categories.find(false);
        const existing = allCats.find(
          (c) => c._id !== category._id && c.name.toLowerCase() === trimmedName.toLowerCase()
        );
        if (existing) {
          res
            .status(409)
            .json({ success: false, message: `Category "${trimmedName}" already exists.` });
          return;
        }
      }

      const updated = await db.categories.update(category._id, req.body);

      res.json({
        success: true,
        message: 'Category updated successfully.',
        category: updated,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// Admin: Delete category
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const category = await db.categories.findById(req.params.id);
    if (!category) {
      res.status(404).json({ success: false, message: 'Category not found.' });
      return;
    }

    // Check if category still has products
    const products = await db.products.find({ activeOnly: false });
    const productCount = products.filter(
      (p) => p.category.toLowerCase() === category.name.toLowerCase()
    ).length;

    if (productCount > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot delete category "${category.name}". It still contains ${productCount} product(s).`,
      });
      return;
    }

    const success = await db.categories.delete(category._id);
    if (!success) {
      res.status(404).json({ success: false, message: 'Category not found.' });
      return;
    }
    res.json({ success: true, message: 'Category deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
