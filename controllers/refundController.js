const { shopifyRestClient } = require("../shopify");
const db= require('../database/db');

const calculateRefund = async (req, res) => {
  try {
    const { order_id, line_items } = req.body;

    const order = await db.orders.findOne({
      where: { order_id },
      include: [
        {
          model: db.line_items,
          as: 'line_items',
        },
      ],
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    let totalRefundAmount = 0;

    for (const item of line_items) {
      const { variant_id, quantity } = item;

      const lineItem = await db.line_items.findOne({
        where: {
          order_id: order_id,
          variant_id: variant_id,
        },
      });

      if (!lineItem) {
        return res.status(400).json({
          message: `Line item with variant_id ${variant_id} not found.`,
        });
      }

      const lineItemRefundAmount = parseFloat(lineItem.price) * quantity;

      if (quantity > lineItem.quantity) {
        return res.status(400).json({
          message: `Refund quantity exceeds purchased quantity for variant_id ${variant_id}.`,
        });
      }

      totalRefundAmount += lineItemRefundAmount;
    }

    const taxRefund = parseFloat(order.tax) || 0;
    const shippingRefund = parseFloat(order.shipping_amount) || 0;

    const totalRefund = totalRefundAmount + taxRefund + shippingRefund;

    res.status(200).json({
      message: 'Refund calculated successfully',
      totalRefund,
      breakdown: {
        lineItemsRefund: totalRefundAmount,
        taxRefund,
        shippingRefund,
      },
    });
  } catch (error) {
    console.error('Error calculating refund:', error);
    res.status(500).json({
      message: 'An unexpected error occurred while calculating the refund.',
      error: error.message,
    });
  }
};



const refundOrder = async (req, res) => {
  const { order_id, refund } = req.body;
  const store_domain = req.shop.shop;
  const shopifyAccessToken = req.shop.accessToken;
  const client = shopifyRestClient(store_domain, shopifyAccessToken);

  const refundPayload = {
    refund: {
      currency: refund.currency,
      notify: refund.notify,
      shipping: refund.shipping,
      note: refund.note,
      refund_line_items: refund.refundLineItems,
      transactions: refund.transactions.map(transaction => ({
        parent_id: transaction.parent_id,
        amount: transaction.amount,
        kind: transaction.kind,
        gateway: transaction.gateway,
      })),
    },
  };

  try {
    const refundResponse = await client.post({
      path: `orders/${order_id}/refunds`,
      data: refundPayload,
    });
    const refundId = refundResponse.body.refund.id; 

    console.log('Refund Response:', refundResponse.body);


    const newRefund = await db.refunds.create({
      order_id, 
      refund_id: refundId, 
      currency: refund.currency, 
      note: refund.note, 
    });

    const newLine = await db.refund_line_items.bulkCreate(refund.refundLineItems.map(item => ({
      refund_id: newRefund.id,
      line_item_id: item.line_item_id,
      quantity: item.quantity,
      subtotal: item.subtotal,
    })));
    

    res.status(200).json({
      message: 'Refund created successfully in Shopify and saved to database',
      refund: newRefund,
      refundLineItems: newLine,
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ message: 'Failed to process refund', error: error.message });
  }
};

  
  

















module.exports.refundOrder = refundOrder;
module.exports.calculateRefund = calculateRefund;
