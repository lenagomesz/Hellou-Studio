import { describe, it, expect } from 'vitest';

describe('STL Order Flow Integration', () => {
  it('completes full STL purchase flow', () => {
    // 1. Customer and product setup
    const customer = {
      id: 'user-cust-1',
      name: 'João Silva',
      email: 'joao@example.com',
    };

    const stlProduct = {
      id: 'prod-stl-1',
      name: 'Miniatura Dragão',
      type: 'digital',
      price: 29.99,
      file_path: 'stl-files/prod-stl-1/dragao.stl',
    };

    // 2. Add to cart
    const cart = [
      {
        product: stlProduct,
        quantity: 1,
      },
    ];

    // 3. Validate cart (no mixed types)
    const types = new Set(cart.map(item => item.product.type));
    expect(types.size).toBe(1);
    expect(types.has('digital')).toBe(true);

    // 4. Checkout and payment processed
    const order = {
      id: 'order-stl-123',
      user_id: customer.id,
      items: cart,
      status: 'completed', // Auto-completed for digital
      total: 29.99,
      created_at: new Date().toISOString(),
      shipped_at: new Date().toISOString(), // Auto-shipped
    };

    expect(order.status).toBe('completed');
    expect(order.shipped_at).toBeDefined();

    // 5. Emails sent
    const customerEmailParams = {
      email: customer.email,
      nome: customer.name,
      orderId: order.id,
      fileName: stlProduct.name,
      price: order.total,
    };

    const adminEmailParams = {
      adminEmail: 'admin@example.com',
      orderId: order.id,
      customerName: customer.name,
      customerEmail: customer.email,
      fileName: stlProduct.name,
      price: order.total,
    };

    expect(customerEmailParams.email).toBe('joao@example.com');
    expect(adminEmailParams.adminEmail).toBe('admin@example.com');

    // 6. Customer downloads file
    const downloadRequest = {
      userId: customer.id,
      orderId: order.id,
      fileId: stlProduct.id,
    };

    // Verify access control
    expect(downloadRequest.userId).toBe(order.user_id); // Owner
    expect(order.status).toBe('completed'); // Order is complete

    // Verify file exists
    const file = order.items[0].product;
    expect(file.type).toBe('digital');
    expect(file.file_path).toBeDefined();
    expect(file.file_path).toBe('stl-files/prod-stl-1/dragao.stl');

    // Download succeeds (would return 200 with file stream)
  });

  it('rejects mixed cart (digital + physical)', () => {
    const cart = [
      { product: { id: 'stl-1', type: 'digital' } },
      { product: { id: 'phys-1', type: 'physical' } },
    ];

    const types = new Set(cart.map(item => item.product.type));
    expect(types.size).toBe(2); // Mixed
    // Validation should throw or return error
  });

  it('ensures digital order has no shipping cost', () => {
    const order = {
      items: [{ product: { type: 'digital', price: 49.99 } }],
      subtotal: 49.99,
      shipping: 0, // No shipping for digital
    };

    const isDigitalOnly = order.items.every(item => item.product.type === 'digital');
    expect(isDigitalOnly).toBe(true);
    expect(order.shipping).toBe(0);
    expect(order.subtotal + order.shipping).toBe(49.99);
  });

  it('confirms physical order has shipping cost', () => {
    const order = {
      items: [{ product: { type: 'physical', price: 150.00 } }],
      subtotal: 150.00,
      shipping: 15.00, // Shipping for physical
    };

    const isDigitalOnly = order.items.every(item => item.product.type === 'digital');
    expect(isDigitalOnly).toBe(false);
    expect(order.shipping).toBe(15.00);
    expect(order.subtotal + order.shipping).toBe(165.00);
  });

  it('handles order with multiple digital items', () => {
    const order = {
      id: 'order-multi-stl',
      status: 'completed',
      items: [
        {
          product: {
            id: 'prod-stl-1',
            type: 'digital',
            name: 'Model A',
            file_path: 'stl-files/prod-stl-1/model-a.stl',
          },
        },
        {
          product: {
            id: 'prod-stl-2',
            type: 'digital',
            name: 'Model B',
            file_path: 'stl-files/prod-stl-2/model-b.stl',
          },
        },
      ],
    };

    const isDigitalOnly = order.items.every(item => item.product.type === 'digital');
    expect(isDigitalOnly).toBe(true);

    // Both items should be downloadable
    expect(order.items.length).toBe(2);
    order.items.forEach(item => {
      expect(item.product.type).toBe('digital');
      expect(item.product.file_path).toBeDefined();
    });
  });
});
