import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

// Inicializa o cliente do Supabase com privilégios administrativos
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const sig = req.headers.get("Stripe-Signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      console.error("Erro no Webhook: Stripe-Signature ou STRIPE_WEBHOOK_SECRET ausentes.");
      return NextResponse.json(
        { error: "Assinatura ou chave do webhook ausentes." },
        { status: 400 }
      );
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err: any) {
      console.error(`Falha na validação de assinatura do Webhook: ${err.message}`);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }

    const type = event.type;
    console.log(`[Stripe Webhook] Recebido evento: ${type}`);

    switch (type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const userId = session.client_reference_id;
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        if (!userId) {
          console.warn("checkout.session.completed disparado sem client_reference_id.");
          break;
        }

        console.log(`[Stripe Webhook] Pagamento confirmado para o usuário ${userId}. Atualizando perfil...`);

        // Atualiza a coluna is_premium e os identificadores do Stripe no Supabase
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({
            is_premium: true,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            updated_at: new Date().toISOString()
          })
          .eq("id", userId);

        if (error) {
          console.error(`[Stripe Webhook] Erro ao salvar status premium do usuário ${userId}:`, error);
          throw error;
        }

        console.log(`[Stripe Webhook] Perfil do usuário ${userId} atualizado para PREMIUM com sucesso.`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const subscriptionId = subscription.id;

        console.log(`[Stripe Webhook] Assinatura cancelada no Stripe: ${subscriptionId}. Desativando premium no Supabase...`);

        // Desativa premium do usuário correspondente no Supabase
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({
            is_premium: false,
            stripe_subscription_id: null,
            updated_at: new Date().toISOString()
          })
          .eq("stripe_subscription_id", subscriptionId);

        if (error) {
          console.error(`[Stripe Webhook] Erro ao desativar status premium para a assinatura ${subscriptionId}:`, error);
          throw error;
        }

        console.log(`[Stripe Webhook] Premium desativado com sucesso para a assinatura ${subscriptionId}.`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        const subscriptionId = subscription.id;
        const status = subscription.status;

        console.log(`[Stripe Webhook] Assinatura atualizada no Stripe: ${subscriptionId} (${status})`);

        // Se o status da assinatura for válido, mantém ou concede premium
        const activeStatuses = ["active", "trialing"];
        const isPremium = activeStatuses.includes(status);

        const { error } = await supabaseAdmin
          .from("profiles")
          .update({
            is_premium: isPremium,
            updated_at: new Date().toISOString()
          })
          .eq("stripe_subscription_id", subscriptionId);

        if (error) {
          console.error(`[Stripe Webhook] Erro ao atualizar status de assinatura ${subscriptionId}:`, error);
          throw error;
        }

        console.log(`[Stripe Webhook] Status premium atualizado para ${isPremium} para a assinatura ${subscriptionId}.`);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Evento ignorado: ${type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Erro interno ao processar o webhook do Stripe:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar o webhook." },
      { status: 500 }
    );
  }
}
