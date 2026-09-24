import { mkdirSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedEditorialCompanies } from "./seed-companies";

mkdirSync("data", { recursive: true });
const prisma = new PrismaClient();

const tailEs = " TECHPODIO publica fichas que las propias empresas completan. No estima financiación, plantilla ni cuota de mercado.";
const tailEn = " TECHPODIO publishes profiles companies complete themselves. It does not estimate funding, headcount, or market share.";

const categories: Array<[string, string, string, string, string, string, string | null, number]> = [
  ["artificial-intelligence", "Inteligencia artificial", "Artificial intelligence", "Sistemas que aprenden o infieren a partir de datos.", "Systems that learn or infer from data.", "ai", null, 10],
  ["generative-ai", "IA generativa", "Generative AI", "Modelos que generan texto, imagen, audio o código.", "Models that generate text, image, audio, or code.", "ai", "artificial-intelligence", 11],
  ["ai-agents", "Agentes de IA", "AI agents", "Software que ejecuta tareas con herramientas y objetivos.", "Software that carries out tasks with tools and goals.", "ai", "artificial-intelligence", 12],
  ["machine-learning", "Aprendizaje automático", "Machine learning", "Entrenamiento y puesta en producción de modelos.", "Training models and running them in production.", "ai", "artificial-intelligence", 13],
  ["computer-vision", "Visión por computador", "Computer vision", "Interpretación de imagen y vídeo.", "Interpretation of images and video.", "ai", "artificial-intelligence", 14],
  ["natural-language-processing", "Procesamiento de lenguaje", "Natural language processing", "Comprensión y generación de lenguaje.", "Understanding and generating language.", "ai", "artificial-intelligence", 15],
  ["mlops", "MLOps", "MLOps", "Operación, evaluación y despliegue de modelos.", "Operating, evaluating, and deploying models.", "ai", "artificial-intelligence", 16],
  ["data-analytics", "Datos y analítica", "Data and analytics", "Infraestructura y productos para analizar datos.", "Infrastructure and products for analysing data.", "general", null, 20],
  ["cloud-infrastructure", "Infraestructura cloud", "Cloud infrastructure", "Cómputo, redes y plataformas cloud.", "Compute, networks, and cloud platforms.", "general", null, 21],
  ["devtools", "Herramientas para desarrolladores", "Developer tools", "Software para construir y operar código.", "Software for building and operating code.", "general", null, 22],
  ["cybersecurity", "Ciberseguridad", "Cybersecurity", "Protección de sistemas, identidades y datos.", "Protection of systems, identities, and data.", "general", null, 23],
  ["fintech", "Fintech", "Fintech", "Productos tecnológicos para servicios financieros.", "Technology products for financial services.", "general", null, 30],
  ["payments", "Pagos", "Payments", "Cobros, payouts y orquestación de pagos.", "Collections, payouts, and payment orchestration.", "general", null, 31],
  ["insurtech", "Insurtech", "Insurtech", "Tecnología para seguros.", "Technology for insurance.", "general", null, 32],
  ["healthtech", "Salud digital", "Healthtech", "Software y dispositivos para salud.", "Software and devices for health.", "general", null, 33],
  ["biotech", "Biotech", "Biotech", "Biotecnología aplicada.", "Applied biotechnology.", "general", null, 34],
  ["climate-tech", "Tecnología climática", "Climate tech", "Productos para medir o reducir impacto climático.", "Products that measure or reduce climate impact.", "general", null, 40],
  ["energy", "Energía", "Energy", "Software y sistemas para energía.", "Software and systems for energy.", "general", null, 41],
  ["mobility", "Movilidad", "Mobility", "Tecnología para mover personas o vehículos.", "Technology for moving people or vehicles.", "general", null, 42],
  ["logistics", "Logística", "Logistics", "Cadenas de suministro y entrega.", "Supply chains and delivery.", "general", null, 43],
  ["ecommerce", "Comercio electrónico", "E-commerce", "Infraestructura para vender online.", "Infrastructure for selling online.", "general", null, 44],
  ["martech", "Marketing technology", "Marketing technology", "Herramientas de captación y analítica comercial.", "Tools for acquisition and commercial analytics.", "general", null, 45],
  ["hrtech", "Talento", "HR tech", "Software de personas y contratación.", "People and hiring software.", "general", null, 46],
  ["legaltech", "Legaltech", "Legaltech", "Herramientas para trabajo jurídico.", "Tools for legal work.", "general", null, 47],
  ["proptech", "Proptech", "Proptech", "Tecnología para activos inmobiliarios.", "Technology for real-estate assets.", "general", null, 48],
  ["edtech", "Edtech", "Edtech", "Productos de aprendizaje.", "Learning products.", "general", null, 49],
  ["saas", "SaaS", "SaaS", "Software por suscripción para empresas.", "Subscription software for companies.", "general", null, 50],
  ["semiconductors", "Semiconductores", "Semiconductors", "Diseño o fabricación de chips.", "Chip design or manufacturing.", "general", null, 51],
  ["robotics", "Robótica", "Robotics", "Robots y automatización física.", "Robots and physical automation.", "general", null, 52],
  ["iot", "Internet de las cosas", "Internet of Things", "Dispositivos conectados y su software.", "Connected devices and their software.", "general", null, 53],
  ["blockchain", "Blockchain", "Blockchain", "Infraestructura y aplicaciones de registro distribuido.", "Distributed-ledger infrastructure and applications.", "general", null, 54],
  ["quantum", "Computación cuántica", "Quantum computing", "Hardware o software cuántico.", "Quantum hardware or software.", "general", null, 55],
  ["spacetech", "Espacio", "Space tech", "Tecnología espacial y de observación.", "Space and observation technology.", "general", null, 56],
  ["defense-tech", "Tecnología de defensa", "Defense tech", "Productos para defensa y seguridad.", "Products for defence and security.", "general", null, 57],
  ["industrial-tech", "Tecnología industrial", "Industrial tech", "Software y automatización industrial.", "Industrial software and automation.", "general", null, 58],
  ["agritech", "Agritech", "Agritech", "Tecnología para agricultura.", "Technology for agriculture.", "general", null, 59],
  ["foodtech", "Foodtech", "Foodtech", "Tecnología para alimentación.", "Technology for food.", "general", null, 60],
  ["telecom", "Telecomunicaciones", "Telecom", "Redes y servicios de comunicación.", "Networks and communication services.", "general", null, 61],
  ["productivity", "Productividad", "Productivity", "Herramientas de trabajo en equipo.", "Team work tools.", "general", null, 62],
  ["identity-access", "Identidad y acceso", "Identity and access", "Autenticación, autorización y fraude de identidad.", "Authentication, authorisation, and identity fraud.", "general", null, 63],
  ["observability", "Observabilidad", "Observability", "Métricas, logs y trazas de sistemas.", "Metrics, logs, and traces.", "general", null, 64],
  ["open-source", "Código abierto", "Open source", "Empresas cuyo producto principal es open source.", "Companies whose main product is open source.", "general", null, 65],
  ["deep-tech", "Deep tech", "Deep tech", "Ciencia aplicada con ciclo de desarrollo largo.", "Applied science with a long development cycle.", "general", null, 66],
  ["govtech", "Govtech", "Govtech", "Tecnología para el sector público.", "Technology for the public sector.", "general", null, 67],
  ["traveltech", "Traveltech", "Traveltech", "Software para viajes y hospitalidad.", "Software for travel and hospitality.", "general", null, 68],
  ["gaming", "Videojuegos", "Gaming", "Estudios y herramientas de software interactivo.", "Studios and interactive-software tools.", "general", null, 69],
  ["content-tools", "Herramientas de contenido", "Content tools", "Software B2B para producir o distribuir contenido.", "B2B software to produce or distribute content.", "general", null, 70],
  ["sustainability-software", "Software de sostenibilidad", "Sustainability software", "Medición y reporte ambiental para empresas.", "Environmental measurement and reporting for companies.", "general", null, 71],
];

const countries: Array<[string, string, string, string]> = [
  ["AT", "austria", "Austria", "Austria"],
  ["BE", "belgica", "Bélgica", "Belgium"],
  ["BG", "bulgaria", "Bulgaria", "Bulgaria"],
  ["HR", "croacia", "Croacia", "Croatia"],
  ["CY", "chipre", "Chipre", "Cyprus"],
  ["CZ", "chequia", "Chequia", "Czechia"],
  ["DK", "dinamarca", "Dinamarca", "Denmark"],
  ["EE", "estonia", "Estonia", "Estonia"],
  ["FI", "finlandia", "Finlandia", "Finland"],
  ["FR", "francia", "Francia", "France"],
  ["DE", "alemania", "Alemania", "Germany"],
  ["GR", "grecia", "Grecia", "Greece"],
  ["HU", "hungria", "Hungría", "Hungary"],
  ["IE", "irlanda", "Irlanda", "Ireland"],
  ["IT", "italia", "Italia", "Italy"],
  ["LV", "letonia", "Letonia", "Latvia"],
  ["LT", "lituania", "Lituania", "Lithuania"],
  ["LU", "luxemburgo", "Luxemburgo", "Luxembourg"],
  ["MT", "malta", "Malta", "Malta"],
  ["NL", "paises-bajos", "Países Bajos", "Netherlands"],
  ["PL", "polonia", "Polonia", "Poland"],
  ["PT", "portugal", "Portugal", "Portugal"],
  ["RO", "rumania", "Rumanía", "Romania"],
  ["SK", "eslovaquia", "Eslovaquia", "Slovakia"],
  ["SI", "eslovenia", "Eslovenia", "Slovenia"],
  ["ES", "espana", "España", "Spain"],
  ["SE", "suecia", "Suecia", "Sweden"],
  ["GB", "reino-unido", "Reino Unido", "United Kingdom"],
];

const cities: Array<[string, string, string, boolean]> = [
  ["madrid", "Madrid", "ES", true],
  ["barcelona", "Barcelona", "ES", true],
  ["valencia", "Valencia", "ES", true],
  ["sevilla", "Sevilla", "ES", false],
  ["zaragoza", "Zaragoza", "ES", false],
  ["malaga", "Málaga", "ES", true],
  ["murcia", "Murcia", "ES", false],
  ["palma", "Palma", "ES", false],
  ["las-palmas", "Las Palmas de Gran Canaria", "ES", false],
  ["bilbao", "Bilbao", "ES", true],
  ["alicante", "Alicante", "ES", false],
  ["cordoba", "Córdoba", "ES", false],
  ["valladolid", "Valladolid", "ES", false],
  ["vigo", "Vigo", "ES", false],
  ["gijon", "Gijón", "ES", false],
  ["vitoria-gasteiz", "Vitoria-Gasteiz", "ES", false],
  ["granada", "Granada", "ES", false],
  ["a-coruna", "A Coruña", "ES", false],
  ["san-sebastian", "San Sebastián", "ES", false],
  ["santander", "Santander", "ES", false],
  ["lisboa", "Lisboa", "PT", true],
  ["porto", "Porto", "PT", true],
  ["paris", "Paris", "FR", true],
  ["lyon", "Lyon", "FR", true],
  ["marseille", "Marseille", "FR", false],
  ["toulouse", "Toulouse", "FR", false],
  ["berlin", "Berlin", "DE", true],
  ["munich", "Munich", "DE", true],
  ["hamburg", "Hamburg", "DE", false],
  ["frankfurt", "Frankfurt", "DE", true],
  ["cologne", "Cologne", "DE", false],
  ["amsterdam", "Amsterdam", "NL", true],
  ["rotterdam", "Rotterdam", "NL", false],
  ["eindhoven", "Eindhoven", "NL", true],
  ["dublin", "Dublin", "IE", true],
  ["milan", "Milan", "IT", true],
  ["rome", "Rome", "IT", true],
  ["turin", "Turin", "IT", false],
  ["brussels", "Brussels", "BE", true],
  ["antwerp", "Antwerp", "BE", false],
  ["vienna", "Vienna", "AT", true],
  ["stockholm", "Stockholm", "SE", true],
  ["gothenburg", "Gothenburg", "SE", false],
  ["copenhagen", "Copenhagen", "DK", true],
  ["helsinki", "Helsinki", "FI", true],
  ["warsaw", "Warsaw", "PL", true],
  ["krakow", "Kraków", "PL", true],
  ["prague", "Prague", "CZ", true],
  ["brno", "Brno", "CZ", false],
  ["budapest", "Budapest", "HU", true],
  ["bucharest", "Bucharest", "RO", true],
  ["cluj-napoca", "Cluj-Napoca", "RO", true],
  ["athens", "Athens", "GR", true],
  ["thessaloniki", "Thessaloniki", "GR", false],
  ["tallinn", "Tallinn", "EE", true],
  ["riga", "Riga", "LV", true],
  ["vilnius", "Vilnius", "LT", true],
  ["luxembourg", "Luxembourg", "LU", true],
  ["bratislava", "Bratislava", "SK", true],
  ["ljubljana", "Ljubljana", "SI", true],
  ["zagreb", "Zagreb", "HR", true],
  ["sofia", "Sofia", "BG", true],
  ["nicosia", "Nicosia", "CY", true],
  ["valletta", "Valletta", "MT", true],
  ["london", "London", "GB", true],
  ["manchester", "Manchester", "GB", true],
  ["edinburgh", "Edinburgh", "GB", false],
  ["cambridge", "Cambridge", "GB", true],
];

const technologies = [
  "TypeScript", "JavaScript", "Python", "Rust", "Go", "Java", "Kotlin", "Swift", "C++", "C#", "PHP", "Ruby", "Elixir", "Scala",
  "React", "Next.js", "Vue", "Angular", "Node.js", "Flutter",
  "PostgreSQL", "MySQL", "SQLite", "MongoDB", "Redis", "Elasticsearch",
  "Kubernetes", "Docker", "Terraform", "AWS", "Azure", "Google Cloud",
  "PyTorch", "TensorFlow", "Hugging Face", "GraphQL", "Kafka", "Spark", "Snowflake", "Databricks", "Solidity",
];

const industries: Array<[string, string, string]> = [
  ["software", "Software", "Software"],
  ["financial-services", "Servicios financieros", "Financial services"],
  ["healthcare", "Salud", "Healthcare"],
  ["energy", "Energía", "Energy"],
  ["mobility", "Movilidad", "Mobility"],
  ["industrial", "Industria", "Industry"],
  ["public-sector", "Sector público", "Public sector"],
  ["retail", "Retail", "Retail"],
  ["media", "Medios", "Media"],
  ["education", "Educación", "Education"],
  ["telecom", "Telecomunicaciones", "Telecom"],
  ["agriculture", "Agricultura", "Agriculture"],
  ["climate", "Clima", "Climate"],
];

function slugify(input: string) {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function main() {
  const categoryIds = new Map<string, string>();
  for (const [slug, es, en, blurbEs, blurbEn, group, , sort] of categories) {
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      categoryIds.set(slug, existing.id);
      continue;
    }
    const created = await prisma.category.create({
      data: {
        slug,
        nameEs: es,
        nameEn: en,
        descriptionEs: `${blurbEs}${tailEs}`,
        descriptionEn: `${blurbEn}${tailEn}`,
        group,
        sortOrder: sort,
      },
    });
    categoryIds.set(slug, created.id);
  }
  for (const [slug, , , , , , parent] of categories) {
    if (!parent) continue;
    const id = categoryIds.get(slug);
    const parentId = categoryIds.get(parent);
    if (!id || !parentId) continue;
    const row = await prisma.category.findUnique({ where: { id } });
    if (row && !row.parentId) await prisma.category.update({ where: { id }, data: { parentId } });
  }

  const countryIds = new Map<string, string>();
  for (const [code, slug, es, en] of countries) {
    const existing = await prisma.country.findUnique({ where: { code } });
    if (existing) {
      countryIds.set(code, existing.id);
      continue;
    }
    const created = await prisma.country.create({ data: { code, slug, nameEs: es, nameEn: en } });
    countryIds.set(code, created.id);
  }

  for (const [slug, name, code, isHub] of cities) {
    const countryId = countryIds.get(code);
    if (!countryId) continue;
    const existing = await prisma.city.findUnique({ where: { slug } });
    if (existing) continue;
    await prisma.city.create({ data: { slug, name, countryId, isHub } });
  }

  for (const name of technologies) {
    const slug = slugify(name);
    const existing = await prisma.technology.findUnique({ where: { slug } });
    if (existing) continue;
    await prisma.technology.create({
      data: {
        slug,
        name,
        descriptionEs: `${name} puede aparecer en una ficha cuando la empresa lo declara. TECHPODIO no infiere el stack.`,
        descriptionEn: `${name} can appear on a profile when the company declares it. TECHPODIO does not infer a stack.`,
      },
    });
  }

  for (const [slug, es, en] of industries) {
    const existing = await prisma.industry.findUnique({ where: { slug } });
    if (existing) continue;
    await prisma.industry.create({ data: { slug, nameEs: es, nameEn: en } });
  }

  const ruleCount = await prisma.pricingRule.count();
  if (ruleCount === 0) {
    const base30: Record<string, number> = {
      RANK_1: 9900,
      RANK_2: 7900,
      RANK_3: 5900,
      TOP_5: 3900,
      FEATURED: 14900,
      PREMIUM: 19900,
    };
    const factors: Record<number, number> = { 7: 0.35, 30: 1, 90: 2.5, 180: 4.2, 365: 7 };
    const note = "Precio de ejemplo. Editable en administración sin redeploy. No es una tarifa cerrada de mercado.";
    for (const [position, amount] of Object.entries(base30)) {
      for (const [days, factor] of Object.entries(factors)) {
        const priceCents = Math.max(100, Math.round((amount * factor) / 100) * 100);
        await prisma.pricingRule.create({
          data: {
            position,
            durationDays: Number(days),
            priceCents,
            currency: "eur",
            active: true,
            example: true,
            note,
          },
        });
      }
    }
    const spain = countryIds.get("ES");
    const ai = categoryIds.get("artificial-intelligence");
    if (spain && ai) {
      await prisma.pricingRule.create({
        data: {
          position: "RANK_1",
          categoryId: ai,
          countryId: spain,
          durationDays: 30,
          priceCents: 12900,
          currency: "eur",
          active: true,
          example: true,
          note: "Ejemplo de regla más específica (España + inteligencia artificial + #1 + 30 días). Gana a la tarifa base.",
        },
      });
    }
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  if (email && password.length >= 10) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          email,
          passwordHash: bcrypt.hashSync(password, 10),
          name: "Admin",
          role: "ADMIN",
          locale: "es",
        },
      });
      console.log(`Admin creado: ${email}`);
    }
  } else {
    console.log("Sin ADMIN_EMAIL y ADMIN_PASSWORD: no se crea administrador.");
  }

  const editorial = await seedEditorialCompanies(prisma);
  console.log(`Seed estructural listo. Fichas editoriales: ${editorial.created} nuevas, ${editorial.skipped} ya presentes.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
