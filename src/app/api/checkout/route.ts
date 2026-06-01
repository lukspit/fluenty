import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return NextResponse.json(
        { error: "Token não fornecido." },
        { status: 401 }
      );
    }

    // Obter o usuário autenticado a partir do token
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) {
      return NextResponse.json(
        { error: "Não autorizado ou sessão expirada." },
        { status: 401 }
      );
    }

    // 1. Obter o priceId do corpo da requisição ou usar o preço padrão
    const body = await req.json().catch(() => ({}));
    let priceId = body.priceId || process.env.STRIPE_PRICE_ID || process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY;
    
    if (!priceId) {
      console.log("Stripe priceId não enviado. Gerando ou buscando plano fallback...");
      const products = await stripe.products.list({ limit: 50 });
      let product = products.data.find(p => p.name === "Fluenty Pro");

      if (!product) {
        product = await stripe.products.create({
          name: "Fluenty Pro",
          description: "Acesso ilimitado à conversação e trilha personalizada por voz no Fluenty",
        });
      }

      const prices = await stripe.prices.list({ product: product.id, active: true });
      let price = prices.data[0];

      if (!price) {
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: 4990, // R$ 49,90 default
          currency: "brl",
          recurring: {
            interval: "month",
          },
        });
      }
      priceId = price.id;
    }

    // 3. Criar a Checkout Session do Stripe redirecionando para o Perfil
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.usefluenty.com";
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      client_reference_id: user.id, // User ID do Supabase
      customer_email: user.email,
      success_url: `${appUrl}/profile?success=true`,
      cancel_url: `${appUrl}/profile?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Erro na API de Checkout do Stripe:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
