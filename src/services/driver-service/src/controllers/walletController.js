const DriverWallet = require('../models/DriverWallet');
const WalletTransaction = require('../models/WalletTransaction');

/**
 * Lấy số dư ví hiện tại của tài xế
 * GET /api/drivers/me/wallet
 */
async function getWalletBalance(req, res) {
    try {
        const driverId = req.user?.id || req.headers['x-driver-id'];

        if (!driverId) {
            return res.status(401).json({ error: 'Unauthorized: Missing driver ID' });
        }

        let wallet = await DriverWallet.findOne({
            where: { driverId }
        });

        if (!wallet) {
            // Nếu chưa có ví, khởi tạo với số dư 0
            wallet = await DriverWallet.create({
                driverId,
                balance: 0
            });
        }

        return res.status(200).json({
            driverId: wallet.driverId,
            balance: parseFloat(wallet.balance),
            currency: wallet.currency,
            status: wallet.status
        });
    } catch (error) {
        console.error('Error fetching wallet balance:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

/**
 * Lấy lịch sử giao dịch (Sổ phụ)
 * GET /api/drivers/me/wallet/transactions
 */
async function getWalletTransactions(req, res) {
    try {
        const driverId = req.user?.id || req.headers['x-driver-id'];

        if (!driverId) {
            return res.status(401).json({ error: 'Unauthorized: Missing driver ID' });
        }

        const transactions = await WalletTransaction.findAll({
            where: { driverId },
            order: [['created_at', 'DESC']],
            limit: 50 // Phân trang đơn giản cho ví dụ
        });

        // Format lại dữ liệu output
        const formattedTransactions = transactions.map(tx => ({
            id: tx.id,
            type: tx.type,
            amount: parseFloat(tx.amount),
            balanceAfter: parseFloat(tx.balanceAfter),
            referenceId: tx.referenceId,
            description: tx.description,
            createdAt: tx.created_at
        }));

        return res.status(200).json({
            transactions: formattedTransactions
        });

    } catch (error) {
        console.error('Error fetching wallet transactions:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}/**
 * Tổng hợp thu nhập của tài xế
 * GET /drivers/earnings
 * Returns: wallet balance + earnings today + total earnings
 */
async function getEarningsSummary(req, res) {
    try {
        const driverId = req.headers['x-user-id'] || req.user?.id;

        if (!driverId) {
            return res.status(401).json({ error: 'Unauthorized: Missing driver ID' });
        }

        // Get or create wallet
        let wallet = await DriverWallet.findOne({ where: { driverId } });
        if (!wallet) {
            wallet = await DriverWallet.create({ driverId, balance: 0 });
        }

        // Get today's earnings from WalletTransaction
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { Op } = require('sequelize');

        const todayEarnings = await WalletTransaction.findAll({
            where: {
                driverId,
                type: 'EARNING',
                created_at: { [Op.gte]: todayStart }
            }
        });

        const earningsToday = todayEarnings.reduce(
            (sum, tx) => sum + parseFloat(tx.amount), 0
        );
        const tripsToday = todayEarnings.length;

        // Get total earnings (all time)
        const allEarnings = await WalletTransaction.sum('amount', {
            where: { driverId, type: 'EARNING' }
        });

        return res.status(200).json({
            driverId: wallet.driverId,
            balance: parseFloat(wallet.balance),
            currency: wallet.currency || 'VND',
            earningsToday,
            tripsToday,
            totalEarnings: parseFloat(allEarnings) || 0,
            status: wallet.status
        });
    } catch (error) {
        console.error('Error fetching earnings summary:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    getWalletBalance,
    getWalletTransactions,
    getEarningsSummary
};
