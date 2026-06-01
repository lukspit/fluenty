import fs from "fs";
import path from "path";
import Stripe from "stripe";

async function main() {
  console.log("🚀 Lendo chaves de produção do .env.local...");
  
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("❌ Arquivo .env.local não encontrado na raiz do projeto!");
    return;
  }

  const envContent = fs.readFileSync(envPath, "utf-8");
  const secretKeyMatch = envContent.match(/STRIPE_SECRET_KEY=([^\s]+)/);
  const secretKey = secretKeyMatch ? secretKeyMatch[1].trim() : null;

  if (!secretKey || secretKey.startsWith("sk_test_...")) {
    console.error("❌ STRIPE_SECRET_KEY válida não encontrada no .env.local!");
    return;
  }

  console.log("🔄 Conectando com a API do Stripe de Produção...");
  const stripe = new Stripe(secretKey, {
    typescript: true,
  });

  try {
    // 1. Criar Produto Fluenty Plus
    console.log("➕ Criando Produto: Fluenty Plus...");
    const plusProduct = await stripe.products.create({
      name: "Fluenty Plus",
      description: "Prática diária leve de conversação por voz com limite de chamadas.",
    });

    console.log("💰 Criando Preço Mensal para Fluenty Plus (R$ 29,90)...");
    const plusMonthlyPrice = await stripe.prices.create({
      product: plusProduct.id,
      unit_amount: 2990,
      currency: "brl",
      recurring: {
        interval: "month",
      },
    });

    // 2. Criar Produto Fluenty Pro
    console.log("➕ Criando Produto: Fluenty Pro...");
    const proProduct = await stripe.products.create({
      name: "Fluenty Pro",
      description: "Acesso 100% ilimitado à conversação, todos os tutores e trilhas personalizadas infinitas.",
    });

    console.log("💰 Criando Preço Mensal para Fluenty Pro (R$ 49,90)...");
    const proMonthlyPrice = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 4990,
      currency: "brl",
      recurring: {
        interval: "month",
      },
    });

    console.log("💰 Criando Preço Anual para Fluenty Pro (R$ 299,00)...");
    const proAnnualPrice = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 29900,
      currency: "brl",
      recurring: {
        interval: "year",
      },
    });

    console.log("\n==================================================");
    console.log("✅ PRODUTOS E PREÇOS CRIADOS COM SUCESSO NO STRIPE!");
    console.log("==================================================");
    console.log(`\n🔹 [FLUENTY PLUS]`);
    console.log(`ID do Produto: ${plusProduct.id}`);
    console.log(`ID do Preço Mensal (R$ 29,90/mês): ${plusMonthlyPrice.id}`);
    console.log(`\n🔹 [FLUENTY PRO]`);
    console.log(`ID do Produto: ${proProduct.id}`);
    console.log(`ID do Preço Mensal (R$ 49,90/mês): ${proMonthlyPrice.id}`);
    console.log(`ID do Preço Anual (R$ 299,00/ano): ${proAnnualPrice.id}`);
    console.log("\n==================================================");
    console.log("💡 Copie os IDs dos preços acima e use nas rotas ou na página de checkout.");
    console.log("==================================================");

  } catch (error: any) {
    console.error("❌ Erro ao criar produtos no Stripe:", error.message || error);
  }
}

main();
