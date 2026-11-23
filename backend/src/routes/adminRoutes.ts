import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../db.ts';
import { AuthRequest, requireAdmin } from '../middleware/auth.ts';
import { validate } from '../middleware/validation.ts';

const router = Router();

const updateOrderStatusSchema = z.object({
  status: z.string().min(1, 'Order status is required.'),
  note: z.string().optional(),
});

const blockUserSchema = z.object({
  isBlocked: z.boolean(),
});

const adjustInventorySchema = z.object({
  adjustment: z.number(),
  reason: z.string().trim().min(1, 'Reason for adjustment is required.'),
});

// Apply admin guard to all admin routes
router.use(requireAdmin);

// Analytics Dashboard
router.get('/dashboard', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const analytics = await db.getAnalytics();
    res.json({
      success: true,
      analytics,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Orders Management
router.get('/orders', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, search } = req.query as { status?: string; search?: string };
    let orders = await db.orders.find({ orderStatus: status });

    if (search) {
      const q = search.toLowerCase().trim();
      orders = orders.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.userName.toLowerCase().includes(q) ||
          o.userEmail.toLowerCase().includes(q)
      );
    }

    res.json({
      success: true,
      orders,
      total: orders.length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const VALID_ADMIN_TRANSITIONS: Record<string, string[]> = {
  Pending: ['Confirmed', 'Processing', 'Cancelled'],
  Confirmed: ['Processing', 'Shipped', 'Cancelled'],
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Out for Delivery', 'Delivered'],
  'Out for Delivery': ['Delivered'],
  Delivered: ['Return Requested', 'Returned'],
  'Return Requested': ['Returned', 'Delivered'],
  Returned: ['Refunded'],
  Cancelled: [],
  Refunded: [],
};

// Update Order Status
router.patch(
  '/orders/:id/status',
  validate({ body: updateOrderStatusSchema }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { status, note } = req.body;
      if (!status) {
        res.status(400).json({ success: false, message: 'Status is required.' });
        return;
      }

      const order = await db.orders.findById(req.params.id);
      if (!order) {
        res.status(404).json({ success: false, message: 'Order not found.' });
        return;
      }

      if (order.orderStatus === status) {
        res.json({
          success: true,
          message: `Order status is already ${status}.`,
          order,
        });
        return;
      }

      const allowedNext = VALID_ADMIN_TRANSITIONS[order.orderStatus];
      if (!allowedNext || !allowedNext.includes(status)) {
        res.status(400).json({
          success: false,
          message: `Invalid status transition from "${order.orderStatus}" to "${status}".`,
        });
        return;
      }

      const updated = await db.orders.updateStatus(
        order._id,
        status,
        note,
        req.user!.name || 'Admin'
      );

      res.json({
        success: true,
        message: `Order status updated to ${status}.`,
        order: updated,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// Customers Management
router.get('/users', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [rawUsers, allOrders] = await Promise.all([db.users.find(), db.orders.find()]);

    const users = rawUsers.map((u) => {
      const { password, ...safeUser } = u;
      const orderCount = allOrders.filter((o) => o.userId === u._id).length;
      return {
        ...safeUser,
        orderCount,
      };
    });

    res.json({
      success: true,
      users,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Block/Unblock Customer
router.patch(
  '/users/:id/block',
  validate({ body: blockUserSchema }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { isBlocked } = req.body;
      const user = await db.users.findById(req.params.id);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      // Admins cannot block themselves
      if (req.user!._id === user._id) {
        res
          .status(400)
          .json({ success: false, message: 'Administrators cannot block themselves.' });
        return;
      }

      if (user.role === 'admin') {
        res
          .status(400)
          .json({ success: false, message: 'Administrator accounts cannot be blocked.' });
        return;
      }

      const updated = await db.users.update(user._id, { isBlocked: Boolean(isBlocked) });
      const { password, ...safeUser } = updated!;

      res.json({
        success: true,
        message: `Customer ${user.name} has been ${isBlocked ? 'blocked' : 'unblocked'}.`,
        user: safeUser,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// Inventory Management
router.get('/inventory', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [products, logs] = await Promise.all([
      db.products.find({ activeOnly: false }),
      db.inventoryLogs.find(),
    ]);

    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 15);
    const outOfStock = products.filter((p) => p.stock === 0);

    res.json({
      success: true,
      products,
      lowStock,
      outOfStock,
      logs,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Single product inventory details
router.get('/inventory/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const product = await db.products.findById(req.params.id);
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found.' });
      return;
    }

    const allLogs = await db.inventoryLogs.find();
    const logs = allLogs.filter((l) => l.productId === product._id);
    res.json({
      success: true,
      product,
      logs,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Adjust Inventory Stock
router.patch(
  '/inventory/:id',
  validate({ body: adjustInventorySchema }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { adjustment, reason } = req.body;
      if (adjustment === undefined || isNaN(Number(adjustment))) {
        res
          .status(400)
          .json({ success: false, message: 'Valid stock adjustment quantity is required.' });
        return;
      }

      if (!reason || !String(reason).trim()) {
        res.status(400).json({ success: false, message: 'Reason for adjustment is required.' });
        return;
      }

      const product = await db.products.findById(req.params.id);
      if (!product) {
        res.status(404).json({ success: false, message: 'Product not found.' });
        return;
      }

      const adj = Number(adjustment);
      if (product.stock + adj < 0) {
        res.status(400).json({ success: false, message: 'Resulting stock cannot be negative.' });
        return;
      }

      const success = await db.products.adjustStock(
        product._id,
        adj,
        String(reason).trim(),
        req.user!.name || 'Admin'
      );

      if (!success) {
        res.status(400).json({ success: false, message: 'Failed to adjust stock.' });
        return;
      }

      const updatedProduct = await db.products.findById(product._id);
      const logs = await db.inventoryLogs.find();
      const latestLog = logs[0];
      res.json({
        success: true,
        message: 'Stock updated successfully.',
        product: updatedProduct,
        log: latestLog,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// Escape helper preventing CSV / formula injection
export function escapeCsvCell(value: any): string {
  if (value === null || value === undefined) return '""';
  let str = String(value);

  // If the cell begins with formula characters (=, +, -, @, \t, \r), prepend a single quote
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }

  // Double quotes inside string are doubled for CSV compliance
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

// Reports & CSV Export Data
router.get('/reports', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { range = 'monthly' } = req.query as { range?: string };
    const [allOrders, products, users] = await Promise.all([
      db.orders.find(),
      db.products.find({ activeOnly: false }),
      db.users.find(),
    ]);

    const now = Date.now();
    let cutoff = 0;
    if (range === 'daily') {
      cutoff = now - 24 * 60 * 60 * 1000;
    } else if (range === 'weekly') {
      cutoff = now - 7 * 24 * 60 * 60 * 1000;
    } else if (range === 'yearly') {
      cutoff = now - 365 * 24 * 60 * 60 * 1000;
    } else {
      cutoff = now - 30 * 24 * 60 * 60 * 1000;
    }

    const filteredOrders = allOrders.filter((o) => new Date(o.createdAt).getTime() >= cutoff);

    const validFilteredOrders = filteredOrders.filter(
      (o) =>
        o.orderStatus !== 'Cancelled' &&
        o.orderStatus !== 'Refunded' &&
        o.paymentStatus !== 'Refunded' &&
        o.paymentStatus !== 'Failed'
    );

    const totalSales = validFilteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalOrders = filteredOrders.length;
    const totalCustomers = users.filter((u) => u.role === 'customer').length;

    // Generate CSV data string for orders
    const orderHeaders =
      'Order ID,Customer,Email,Total Amount,Payment Method,Payment Status,Order Status,Date\n';
    const orderRows = filteredOrders
      .map(
        (o) =>
          `${escapeCsvCell(o.orderNumber)},${escapeCsvCell(o.userName)},${escapeCsvCell(o.userEmail)},${escapeCsvCell('₹' + o.totalAmount)},${escapeCsvCell(o.paymentMethod)},${escapeCsvCell(o.paymentStatus)},${escapeCsvCell(o.orderStatus)},${escapeCsvCell(new Date(o.createdAt).toLocaleDateString())}`
      )
      .join('\n');
    const ordersCsv = orderHeaders + orderRows;

    // Generate CSV for products
    const productHeaders = 'SKU,Product Name,Brand,Category,Price,Stock,Rating\n';
    const productRows = products
      .map(
        (p) =>
          `${escapeCsvCell(p.sku)},${escapeCsvCell(p.name)},${escapeCsvCell(p.brand)},${escapeCsvCell(p.category)},${escapeCsvCell('₹' + p.price)},${escapeCsvCell(p.stock)},${escapeCsvCell(p.averageRating)}`
      )
      .join('\n');
    const productsCsv = productHeaders + productRows;

    res.json({
      success: true,
      reports: {
        range,
        totalSales,
        totalOrders,
        totalCustomers,
        ordersCsv,
        productsCsv,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
