const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

async function createReferralCoupon() {
  try {
    const existingCoupons = await stripe.coupons.list({ limit: 100 });
    const existing = existingCoupons.data.find(c => c.id === 'REFERRAL_10_OFF');
    
    if (existing) {
      console.log('Coupon REFERRAL_10_OFF already exists');
      return existing;
    }

    const coupon = await stripe.coupons.create({
      id: 'REFERRAL_10_OFF',
      percent_off: 10,
      duration: 'once',
      name: 'Referral Discount - 10% Off Annual Plan',
      metadata: {
        type: 'referral',
        applies_to: 'annual_only'
      }
    });

    console.log('Created coupon:', coupon.id);
    console.log('Discount:', coupon.percent_off + '% off');
    console.log('Duration:', coupon.duration);
    
    return coupon;
  } catch (error) {
    console.error('Error creating coupon:', error.message);
    throw error;
  }
}

createReferralCoupon()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch(() => process.exit(1));
