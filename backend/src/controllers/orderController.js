import { createCashOnDeliveryOrder, getMyOrders as getMyOrdersService } from '../services/orderService.js';
import { buildWhatsAppUrl } from '../utils/whatsapp.js';

export const checkoutCart = async (req, res, next) => {
  try {
    const order = await createCashOnDeliveryOrder({
      actor: {
        userId: req.orderInput.userId,
        sessionId: req.orderInput.sessionId,
      },
      customerName: req.orderInput.customerName,
      customerPhone: req.orderInput.customerPhone,
      customerAddress: req.orderInput.customerAddress,
      total: req.orderInput.total,
    });

    const whatsappUrl = buildWhatsAppUrl({
      orderNumber: order.orderNumber,
      customer: {
        name: order.customerName,
        phone: order.customerPhone,
        address: order.customerAddress,
      },
      items: order.items,
      totalAmount: order.totalAmount,
    });

    return res.status(201).json({
      success: true,
      orderId: order.orderNumber,
      whatsappUrl,
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

    const orders = await getMyOrdersService(userId);

    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    return next(error);
  }
};
