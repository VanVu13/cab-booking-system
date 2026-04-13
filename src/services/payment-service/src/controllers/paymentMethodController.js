const { v4: uuidv4 } = require('uuid');
const UserPaymentMethod = require('../models/UserPaymentMethod');

/**
 * [MOCK PSP] Giả lập quá trình Add Card / Bind Wallet từ Client.
 * Ở hệ thống thật, client sẽ gửi số thẻ thẳng lên Stripe/Momo, Stripe/Momo trả về 1 cái Token,
 * sau đó client mới gửi Token đó về backend của bạn qua API này.
 *
 * Trong lab này, chúng ta giả lập client gửi thông tin thẻ (chưa mã hóa) lên đây, 
 * và backend đứng ra sinh Token để lưu lại (giả làm cả vai trò frontend tokenizer).
 * 
 * POST /api/payments/methods/add
 */
async function addPaymentMethod(req, res) {
    try {
        const userId = req.headers['x-user-id'];
        const { method, cardNumber, cardBrand } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: Missing user ID' });
        }

        if (!method || !['CARD', 'WALLET'].includes(method)) {
            return res.status(400).json({ error: 'Invalid method. Must be CARD or WALLET.' });
        }

        // --- Mock Tokenization (Giả lập PSP tạo token từ thông tin thật) ---
        // Sinh ra một token ảo bảo mật
        const tokenStr = method === 'CARD' ? `tok_visa_${uuidv4().split('-')[0]}` : `tok_momo_${uuidv4().split('-')[0]}`;

        let last4 = null;
        let brand = method === 'WALLET' ? 'MOMO' : (cardBrand || 'VISA');

        if (method === 'CARD' && cardNumber) {
            last4 = cardNumber.slice(-4);
        } else if (method === 'CARD') {
            last4 = '4242'; // Fake default
        }

        // Set isDefault = true nếu đây là thẻ đầu tiên
        const existingMethodsCount = await UserPaymentMethod.count({ where: { userId, status: 'ACTIVE' } });
        const isDefault = existingMethodsCount === 0;

        // Lưu vào DB
        const paymentMethod = await UserPaymentMethod.create({
            userId,
            method,
            token: tokenStr,
            last4,
            brand,
            isDefault
        });

        console.log(`[MOCK BANK] User ${userId} linked a new ${method} (Token: ${tokenStr})`);

        return res.status(201).json({
            message: 'Payment method linked successfully',
            paymentMethod: {
                id: paymentMethod.id,
                method: paymentMethod.method,
                token: paymentMethod.token, // Return token to client so app knows the selected token
                last4: paymentMethod.last4,
                brand: paymentMethod.brand,
                isDefault: paymentMethod.isDefault
            }
        });

    } catch (error) {
        console.error('Error adding payment method:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Lấy danh sách thẻ / ví đã liên kết của user.
 * GET /api/payments/methods
 */
async function getUserPaymentMethods(req, res) {
    try {
        const userId = req.headers['x-user-id'];

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: Missing user ID' });
        }

        const methods = await UserPaymentMethod.findAll({
            where: { userId, status: 'ACTIVE' },
            order: [['created_at', 'DESC']]
        });

        return res.status(200).json({ methods });

    } catch (error) {
        console.error('Error fetching payment methods:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    addPaymentMethod,
    getUserPaymentMethods
};
