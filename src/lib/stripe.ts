import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn("Aviso: STRIPE_SECRET_KEY não foi encontrada nas variáveis de ambiente.");
}

export const stripe = new Stripe(stripeSecretKey || "", {
  apiVersion: "2024-11-20.accommodate-sdk-in-node" as any,
  typescript: true,
});
