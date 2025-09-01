# KitchenViz Backend

## Environment Variables Setup

To run this application, you need to create a `.env` file in the root directory with the following variables:

### Required Environment Variables

```bash
# PhonePe Payment Gateway Configuration
MERCHANT_ID=your_merchant_id_here
MERCHANT_KEY=your_merchant_key_here

# Database Configuration
DB_URL=mongodb://localhost:27017/kitchenviz

# Server Configuration
PORT=5000
```

### PhonePe Configuration

1. **MERCHANT_ID**: Your PhonePe merchant ID (provided by PhonePe)
2. **MERCHANT_KEY**: Your PhonePe merchant key (provided by PhonePe)

### Getting PhonePe Credentials

1. Sign up for a PhonePe merchant account at [PhonePe Business](https://business.phonepe.com/)
2. Complete the merchant verification process
3. Get your Merchant ID and Merchant Key from the PhonePe dashboard
4. For testing, use the sandbox environment credentials

### Installation and Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file with your configuration

3. Start the server:
   ```bash
   npm run dev  # for development
   npm start    # for production
   ```

### Payment Integration

The application includes PhonePe payment gateway integration. When placing an order with `paymentMethod: 'phonepe'`, the system will:

1. Create the order in the database
2. Initiate payment with PhonePe
3. Return payment details to the client
4. Handle payment callbacks

### API Endpoints

- `POST /order/place-order` - Place a new order with optional payment
- Other endpoints are documented in their respective route files

### Error Handling

The application includes comprehensive error handling for:
- Missing environment variables
- Payment gateway failures
- Database connection issues
- Validation errors

Payment failures won't prevent order creation, but will be logged for monitoring.


