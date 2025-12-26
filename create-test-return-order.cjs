const admin = require('firebase-admin');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Function to initialize Firebase with different auth methods
async function initializeFirebase() {
    try {
        // Method 1: Try using service account if available
        if (fs.existsSync('./serviceAccountKey.json')) {
            const serviceAccount = require('./serviceAccountKey.json');
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: 'dentpal-161e5'
            });
            console.log('✅ Initialized with service account key');
            return true;
        }
        
        // Method 2: Try using application default credentials with explicit project
        admin.initializeApp({
            projectId: 'dentpal-161e5'
        });
        
        // Test the connection
        const db = admin.firestore();
        await db.collection('_test').limit(1).get();
        console.log('✅ Initialized with default credentials');
        return true;
        
    } catch (error) {
        console.log('❌ Firebase initialization failed:', error.message);
        return false;
    }
}

async function createTestReturnOrder() {
    console.log('🔥 Creating Test Order for Return Testing');
    console.log('Project ID: dentpal-161e5');
    console.log('');
    
    // Initialize Firebase
    const initialized = await initializeFirebase();
    if (!initialized) {
        console.log('');
        console.log('❌ Failed to initialize Firebase. Please try one of these options:');
        console.log('');
        console.log('1. Download service account key:');
        console.log('   - Go to Firebase Console > Project Settings > Service Accounts');
        console.log('   - Generate new private key and save as serviceAccountKey.json');
        console.log('');
        console.log('2. Use gcloud authentication:');
        console.log('   gcloud auth application-default login');
        console.log('');
        return;
    }
    
    try {
        const db = admin.firestore();
        
        // Current timestamp
        const now = admin.firestore.Timestamp.now();
        
        // Delivery date - 3 days ago (to test 7-day return window)
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() - 3);
        const deliveryTimestamp = admin.firestore.Timestamp.fromDate(deliveryDate);
        
        // Order created date - 10 days ago
        const createdDate = new Date();
        createdDate.setDate(createdDate.getDate() - 10);
        const createdTimestamp = admin.firestore.Timestamp.fromDate(createdDate);
        
        // Payment date - 10 days ago
        const paidDate = new Date();
        paidDate.setDate(paidDate.getDate() - 10);
        const paidTimestamp = admin.firestore.Timestamp.fromDate(paidDate);
        
        // Shipping date - 5 days ago
        const shippingDate = new Date();
        shippingDate.setDate(shippingDate.getDate() - 5);
        const shippingTimestamp = admin.firestore.Timestamp.fromDate(shippingDate);
        
        // Create test order data
        const testOrderData = {
            userId: "C1CDP7Epo0cMgQL8uuMxjYLtBGD3", // Same user from sample
            sellerIds: ["fNEIry9W7lRWizOmb2ZC0tZoOGu2"], // Same seller from sample
            items: [
                {
                    productId: "J32Sa5K5WRPoZGz73IEp",
                    productName: "curaprox toothbrush test - blue",
                    productImage: "https://firebasestorage.googleapis.com/v0/b/dentpal-161e5.firebasestorage.app/o/ProductImages%2F1764639356215%2Ftoothbrush-cs-5460-ortho.jpg?alt=media&token=d0dcab22-993e-4ba8-af23-1b23c8274772",
                    price: 540,
                    quantity: 1,
                    variationId: "YEXWmSqCUCGKBUEujbKv",
                    sellerId: "fNEIry9W7lRWizOmb2ZC0tZoOGu2",
                    sellerName: "Unknown Seller"
                }
            ],
            summary: {
                subtotal: 540,
                shippingCost: 150,
                taxAmount: 0,
                discountAmount: 0,
                total: 690,
                totalItems: 1,
                sellerShippingCharge: 0,
                buyerShippingCharge: 150,
                shippingSplitRule: "buyer_pays_full"
            },
            fees: {
                paymentProcessingFee: 17.25,
                platformFee: 48,
                totalSellerFees: 65.25,
                paymentMethod: "gcash"
            },
            sellerFeeBreakdowns: [
                {
                    sellerId: "fNEIry9W7lRWizOmb2ZC0tZoOGu2",
                    sellerName: "Unknown Seller",
                    cartValue: 540,
                    shippingCost: 150,
                    buyerShippingCharge: 150,
                    sellerShippingCharge: 0,
                    shippingSplitRule: "buyer_pays_full",
                    totalChargedToBuyer: 690,
                    paymentProcessingFee: 17.25,
                    platformFee: 48,
                    totalSellerFees: 65.25,
                    netPayoutToSeller: 474.75
                }
            ],
            metadata: {
                test_order: true,
                test_purpose: "return_request_testing",
                cart_item_ids: ["TEST_CART_ITEM_001"]
            },
            createdAt: createdTimestamp,
            paymongo: {
                checkoutSessionId: "cs_TEST_RETURN_ORDER_001",
                checkoutUrl: "https://checkout.paymongo.com/test_return_order",
                paymentMethod: "gcash",
                paymentStatus: "paid",
                amount: 690,
                currency: "PHP",
                paymentId: "pay_TEST_RETURN_001",
                paymentIntentId: "pi_TEST_RETURN_001",
                paidAt: paidTimestamp
            },
            payout: {
                netPayoutToSeller: 474.75,
                calculatedAt: paidTimestamp
            },
            statusHistory: [
                {
                    status: "pending",
                    note: "Order created",
                    timestamp: createdTimestamp
                },
                {
                    note: "Payment paid via gcash",
                    timestamp: paidTimestamp,
                    status: "confirmed"
                },
                {
                    status: "to_ship",
                    timestamp: paidTimestamp,
                    note: "Order confirmed and ready to be processed"
                },
                {
                    timestamp: shippingTimestamp,
                    status: "shipping",
                    note: "Order shipped via JRS Express. Reference: DPAL-TEST-RETURN-001, Tracking: TEST-TRACKING-001"
                },
                {
                    timestamp: deliveryTimestamp,
                    status: "delivered",
                    note: "Order delivered successfully"
                }
            ],
            shippingInfo: {
                addressId: "4rJmHkYxpSNrn49kjmim",
                fullName: "Rain",
                addressLine1: "5A Sunrise Street, Corner Mola",
                addressLine2: null,
                city: "Makati City",
                state: "Metro Manila",
                postalCode: "1227",
                country: "Philippines",
                phoneNumber: "+639123456789",
                jrs: {
                    response: {
                        ShippingRequestEntityDto: {
                            Id: "TEST-UUID-RETURN-001",
                            DateRequested: shippingDate.toISOString(),
                            DateCreated: shippingDate.toISOString(),
                            CreatedByUserEmail: "christofer.rrnewtech@gmail.com",
                            ShipperFirstName: "tofer",
                            ShipperMiddleName: "",
                            ShipperLastName: "Support",
                            ShipperEmail: "christofer.rrnewtech@gmail.com",
                            ShipperPhone: "09120732452",
                            ShipperProvince: "Batangas",
                            ShipperMunicipality: "San Pascual",
                            ShipperDistrict: "Barangay Kamuning",
                            ShipperAddressLine1: "blk 11 lot 19 desert rose street",
                            ShipperCountry: "Philippines",
                            RecipientFirstName: "Rain",
                            RecipientMiddleName: "",
                            RecipientLastName: "N/A",
                            RecipientEmail: "customer@dentpal.ph",
                            RecipientPhone: "+639123456789",
                            RecipientProvince: "Metro Manila",
                            RecipientMunicipality: "Makati City",
                            RecipientDistrict: "N/A",
                            RecipientAddressLine1: "5A Sunrise Street, Corner Mola",
                            RecipientCountry: "Philippines",
                            ShipmentRequestStatus: "Delivered",
                            TrackingId: "TEST-TRACKING-001",
                            ShipmentDescription: "Dental Supplies: curaprox toothbrush test - blue",
                            ProductName: "Bulilit Box",
                            Length: 20,
                            Width: 15,
                            Height: 10,
                            Weight: 0.5,
                            DeclaredValue: 540,
                            CodAmountToCollect: 0,
                            TotalShippingAmount: 150,
                            ShippingReferenceNo: "DPAL-TEST-RETURN-001",
                            RequestedPickupSchedule: shippingDate.toISOString(),
                            CurrentDeliveryStatus: "Delivered",
                            CurrentDeliveryStatusDate: deliveryDate.toISOString()
                        },
                        Success: true
                    },
                    shippingReferenceNo: "DPAL-TEST-RETURN-001",
                    trackingId: "TEST-TRACKING-001",
                    requestedAt: shippingTimestamp,
                    totalShippingAmount: 150,
                    pickupSchedule: shippingDate.toISOString(),
                    shippingCharges: {
                        sellerCharge: 0,
                        buyerCharge: 150,
                        totalCharge: 150,
                        chargeApplied: false,
                        chargeAppliedAt: null,
                        payoutAdjustmentId: null
                    }
                }
            },
            status: "delivered",
            updatedAt: deliveryTimestamp
        };
        
        // Create the order
        const orderRef = await db.collection('Order').add(testOrderData);
        const orderId = orderRef.id;
        
        console.log('✅ Test order created successfully!');
        console.log('');
        console.log('📦 Order Details:');
        console.log(`   Order ID: ${orderId}`);
        console.log(`   User ID: ${testOrderData.userId}`);
        console.log(`   Seller ID: ${testOrderData.sellerIds[0]}`);
        console.log(`   Status: ${testOrderData.status}`);
        console.log(`   Total: ₱${testOrderData.summary.total}`);
        console.log(`   Delivered: ${deliveryDate.toLocaleDateString()} (${Math.floor((new Date() - deliveryDate) / (1000 * 60 * 60 * 24))} days ago)`);
        console.log('');
        console.log('🧪 Testing Information:');
        console.log(`   ✓ Order is in "delivered" status`);
        console.log(`   ✓ Delivered 3 days ago (within 7-day return window)`);
        console.log(`   ✓ Has JRS tracking with delivery date`);
        console.log(`   ✓ Ready for return request testing`);
        console.log('');
        console.log('📋 Next Steps:');
        console.log('   1. Use this order ID to test the return request feature');
        console.log('   2. Call requestReturn cloud function with this orderId');
        console.log('   3. Verify the return request is created successfully');
        console.log('   4. Test the processReturnRequest function to approve/reject');
        console.log('');
        console.log('💡 Test Return Request:');
        console.log(`   orderId: "${orderId}"`);
        console.log(`   reason: "defective_item" or "wrong_item" or "not_as_described"`);
        console.log('');
        
        // Save order details to file
        const outputFile = `test-return-order-${orderId}.json`;
        const outputData = {
            orderId: orderId,
            userId: testOrderData.userId,
            sellerId: testOrderData.sellerIds[0],
            status: testOrderData.status,
            deliveredDate: deliveryDate.toISOString(),
            daysAgoDelivered: Math.floor((new Date() - deliveryDate) / (1000 * 60 * 60 * 24)),
            daysRemainingForReturn: 7 - Math.floor((new Date() - deliveryDate) / (1000 * 60 * 60 * 24)),
            total: testOrderData.summary.total,
            trackingId: testOrderData.shippingInfo.jrs.trackingId,
            testPurpose: "return_request_testing",
            orderData: testOrderData
        };
        
        fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
        console.log(`📁 Order details saved to: ${outputFile}`);
        console.log('');
        
    } catch (error) {
        console.error('❌ Error creating test order:', error.message);
        console.error(error);
        process.exit(1);
    }
}

createTestReturnOrder();
