import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

// Stripe 클라이언트 인스턴스 초기화 (비밀키가 없을 경우 에러 처리를 위한 지연 평가)
let stripeInstance: Stripe | null = null;
function getStripe() {
  if (!stripeInstance) {
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not defined in environment variables.');
    }
    stripeInstance = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16' as any, // 2023-10-16 API 버전 지정
    });
  }
  return stripeInstance;
}

export async function POST(req: Request) {
  try {
    const { userId, priceId, locale = 'en' } = await req.json();

    if (!userId || !priceId) {
      return NextResponse.json(
        { error: 'Missing required parameters: userId and priceId' },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const origin = req.headers.get('origin') || 'http://localhost:3000';

    // Stripe Checkout Session 생성
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      // 결제 성공 시 이동할 URL (settings 탭의 subscription 탭으로 복귀)
      success_url: `${origin}/${locale}/settings?tab=subscription&payment=success`,
      // 결제 취소 시 이동할 URL
      cancel_url: `${origin}/${locale}/settings?tab=subscription&payment=cancel`,
      // Webhook과의 연동을 위한 메타데이터 및 참조 정보 설정
      client_reference_id: userId,
      metadata: {
        user_id: userId,
      },
      locale: ['ko', 'en', 'ja', 'zh', 'es'].includes(locale)
        ? (locale as Stripe.Checkout.SessionCreateParams.Locale)
        : 'auto',
    });

    if (!session.url) {
      return NextResponse.json(
        { error: 'Failed to create stripe checkout session URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('[Stripe Checkout Error]', err.message);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
