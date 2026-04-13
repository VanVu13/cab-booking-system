const { getChannel, QUEUES } = require('../config/rabbitmq');
const { sequelize } = require('../config/database');
const DriverWallet = require('../models/DriverWallet');
const WalletTransaction = require('../models/WalletTransaction');

// Phí nền tảng (Platform Fee) mặc định là 20%
const PLATFORM_FEE_PERCENTAGE = 0.20;

/**
 * Start listening for payment.completed events from RabbitMQ
 */
async function startPaymentConsumer() {
    const channel = getChannel();
    if (!channel) {
        console.warn('RabbitMQ channel not ready for payment consumer');
        return;
    }

    const queue = QUEUES.PAYMENT_COMPLETED;
    console.log(`✓ Driver Service listening to queue: ${queue} for Earning updates`);

    channel.consume(queue, async (msg) => {
        if (!msg) return;

        try {
            const event = JSON.parse(msg.content.toString());
            console.log('\n[DRIVER-WALLET] Received Payment Event:', JSON.stringify(event, null, 2));

            if (event.type === 'PaymentCompleted' && event.status === 'SUCCEEDED') {
                await processDriverEarning(event);
            }

            // Ack message when done
            channel.ack(msg);
        } catch (error) {
            console.error('[DRIVER-WALLET] Error processing payment event:', error);
            // Có thể dùng DLQ như bên payment-service để retry, 
            // hiện tại từ chối (nack) cho vào lại queue nếu lỗi mạng.
            // Tránh vứt message nếu chưa xử lý xong tiền nong.
            channel.nack(msg, false, false);
        }
    });
}

/**
 * Handle driver earning logic when a payment succeeds
 */
async function processDriverEarning(event) {
    const { rideId, paymentId, amount } = event;
    const paymentAmount = parseFloat(amount) || 0;

    const driverId = event.driverId;

    if (!driverId) {
        console.warn(`[DRIVER-WALLET] Missing driverId in PaymentCompleted event for ride ${rideId}. Cannot process earnings.`);
        return;
    }

    // Tính toán chiết khấu (Ví dụ: khách trả 50k, driver nhận 40k)
    const platformFee = paymentAmount * PLATFORM_FEE_PERCENTAGE;
    const driverEarning = paymentAmount - platformFee;

    console.log(`[DRIVER-WALLET] Calculating earnings for Ride: ${rideId}`);
    console.log(`[DRIVER-WALLET] Total: ${paymentAmount} VND | Fee: ${platformFee} VND | Driver Gets: ${driverEarning} VND`);

    // Dùng Transaction để đảm bảo tính Acid (atomic) khi cập nhật ví
    const t = await sequelize.transaction();

    try {
        // 1. Tìm hoặc tạo mới ví cho Driver này
        let [wallet, created] = await DriverWallet.findOrCreate({
            where: { driverId },
            defaults: { balance: 0 },
            transaction: t
        });

        // 2. Chặn duplicate processing (Idempotency)
        // Kiểm tra xem đã nhúng transaction cho ride này chưa
        const existingTx = await WalletTransaction.findOne({
            where: { referenceId: paymentId, type: 'EARNING' },
            transaction: t
        });

        if (existingTx) {
            console.log(`[DRIVER-WALLET] Earning for Payment ${paymentId} already processed. Skipping.`);
            await t.rollback();
            return;
        }

        // 3. Cộng tiền vào ví
        const oldBalance = parseFloat(wallet.balance);
        const newBalance = oldBalance + driverEarning;

        wallet.balance = newBalance;
        await wallet.save({ transaction: t });

        // 4. Lưu log giao dịch vào Transaction Ledger
        await WalletTransaction.create({
            driverId: wallet.driverId,
            type: 'EARNING',
            amount: driverEarning,
            balanceAfter: newBalance,
            referenceId: paymentId,
            description: `Earning for Ride ${rideId} (Total: ${paymentAmount}, Fee: 20%)`
        }, { transaction: t });

        // Commit DB Transaction
        await t.commit();
        console.log(`[DRIVER-WALLET] ✅ Added ${driverEarning} VND to Driver ${driverId}'s wallet. New Balance: ${newBalance}`);

    } catch (error) {
        await t.rollback();
        throw error;
    }
}

module.exports = { startPaymentConsumer };
