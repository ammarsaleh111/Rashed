import { buildWhatsAppUrl } from '../utils/whatsapp.js';
import { createOrder, getOrdersForUser } from '../services/orderService.js';

export const checkoutCart = async (req, res, next) => {
  const userId = req.user?.id || null;
  const { customerName, customerPhone, customerEmail, customerCity, customerAddress, customerNotes, items, subtotal } = req.orderInput;

  try {
    const order = await createOrder({
      userId,
      customer: {
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        city: customerCity,
        address: customerAddress,
        notes: customerNotes,
      },
      items,
      subtotal,
    });

    const whatsappUrl = buildWhatsAppUrl({
      orderNumber: order.orderNumber,
      customer: order.customer,
      items: order.items,
      totalAmount: order.totalAmount,
    });

    return res.status(201).json({
      success: true,
      orderId: order.orderNumber,
      whatsappUrl,
      data: {
        order,
        whatsappUrl,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getMyOrders = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const orders = await getOrdersForUser(userId);

    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    return next(error);
  }
};
