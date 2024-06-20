const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InvoiceSchema = new Schema({
    barber: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    appointments: [{ type: Schema.Types.ObjectId, ref: 'Appointment' }],
    amount: { type: Number, required: true },
    percentage: { type: Number, default: 15 },
    createdAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
    invoiceFilePath: { type: String }
});

module.exports = mongoose.model('Invoice', InvoiceSchema);
