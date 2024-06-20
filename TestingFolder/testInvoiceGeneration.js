require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const InvoiceService = require('../services/InvoiceService');
const {User, Barber} = require('../models/User');

const testInvoiceGeneration = async () => {
  try {
    const mongooseConnection = await connectDB.connect();

    // Assuming you have a test barber with a known ID
    const barberId = '66681c70b3ec9452b856f455';
    
    // Ensure the barber exists
    const barber = await User.findById(barberId);
    if (!barber) {
      console.log('Barber not found');
      process.exit(1);
    }

    // Generate the invoice
    const result = await InvoiceService.generateInvoice(barberId);
    
    if (result.success) {
      console.log('Invoice generated successfully:', result.invoice);
    } else {
      console.log('Failed to generate invoice:', result.message);
    }

    await mongooseConnection.disconnect();
  } catch (error) {
    console.error('Error during test invoice generation:', error);
    process.exit(1);
  }
};

testInvoiceGeneration();
