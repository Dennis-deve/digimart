import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

const DOCS: Record<string, { title: string; updated: string; sections: [string, string][] }> = {
  terms: {
    title: 'Terms of Service', updated: '26 August 2026',
    sections: [
      ['1. About DigiMart', 'DigiMart ("we", "us") is a Ghanaian online marketplace operated by DigiMart Ghana. We connect buyers with digital service providers (data bundles, airtime, subscriptions, result checkers), verified sellers of physical goods, and delivery riders. Data bundles are fulfilled exclusively through BundleShopGH. Airtime, result checkers and selected digital services are fulfilled through Muviin.'],
      ['2. Accounts', 'You must provide an accurate Ghanaian phone number. You are responsible for keeping your password and Mobile Money account secure. Roles (customer, reseller, seller, rider, admin) are granted by DigiMart and can be revoked for abuse.'],
      ['3. Orders and payment', 'All payments are collected through Moolre Mobile Money collection. An order is only considered paid after DigiMart receives verified payment confirmation from Moolre — a payment prompt on your phone alone is not proof of payment. A Mobile Money processing fee, shown at checkout, is paid by the buyer.'],
      ['4. Digital goods', 'Data bundles, airtime, subscriptions and result checker vouchers are delivered to the phone number or account you provide at checkout. Fulfilment typically starts within minutes of verified payment. Wrong recipient numbers provided by the buyer cannot be reversed once the provider has fulfilled them.'],
      ['5. Physical goods and delivery', 'Physical items are delivered within our active delivery zones for the fee quoted at checkout, or made available for pickup where supported. Delivery estimates are estimates, not guarantees.'],
      ['6. Sellers and resellers', 'Sellers and resellers set a payout Mobile Money account in their dashboard. Earnings (gross amount minus the platform commission, or reseller markup) are credited when an order completes and can be withdrawn via payout request. Falsifying products, prices or delivery information leads to termination.'],
      ['7. Liability', 'DigiMart facilitates transactions between buyers, providers and sellers. Our liability for any order is limited to the amount paid for that order. We are not liable for provider outages beyond our control, but we will always work to refund or fulfil affected orders.'],
      ['8. Contact', 'Reach us any time through the in-app Support center. For urgent payment issues, include your order number (e.g. DM-XXXXXXX).'],
    ],
  },
  privacy: {
    title: 'Privacy Policy', updated: '26 August 2026',
    sections: [
      ['1. What we collect', 'Your phone number, optional email, order history, delivery addresses you choose to save, and payout account details if you are a seller or reseller. For payments, we never see or store your Mobile Money PIN — payments are approved on your phone via Moolre.'],
      ['2. How we use it', 'To fulfil your orders (including passing the recipient phone number to the relevant provider: BundleShopGH for data, Muviin for airtime/result checkers), to deliver physical goods, to send transactional SMS about your orders, and to pay out earnings.'],
      ['3. What we never do', 'We do not sell your personal data. We do not expose provider API keys or payment credentials to the browser. We do not send marketing SMS without your consent — only transactional messages about your orders and account.'],
      ['4. Data retention', 'Order records are kept for accounting and dispute resolution. You may request deletion of your account data; transaction records required by law will be retained.'],
      ['5. Security', 'Secrets are stored server-side only, sessions use signed HTTP-only cookies, and payment confirmation relies on verified webhooks — never on client-side claims.'],
      ['6. Your rights', 'You can view your data in your account, request a copy, or ask for corrections via Support.'],
    ],
  },
  refunds: {
    title: 'Refund Policy', updated: '26 August 2026',
    sections: [
      ['1. Failed digital fulfilment', 'If a data bundle, airtime top-up, subscription or result checker is not delivered and the provider confirms failure, you get a full refund — to your DigiMart wallet (instant) or back to your Mobile Money (1–3 business days).'],
      ['2. Wrong number', 'If you entered a wrong recipient number and the provider already fulfilled it, we cannot reverse it — always double-check before paying. If fulfilment has not started, we cancel and refund in full.'],
      ['3. Physical goods', 'You may request a refund before an item is out for delivery. Once delivered, returns are accepted within 48 hours for damaged, wrong or non-functional items — include photos in your support request.'],
      ['4. How to request', 'Open a request in the in-app Support center with your order number (DM-XXXXXXX). Refunds are reviewed by DigiMart; approved refunds to your wallet are instant, MoMo reversals take 1–3 business days.'],
      ['5. Payment failures', 'If your payment prompt was approved but no order was created/confirmed, do not pay again — the verified Moolre webhook decides. Contact support with your order number; unverified payments auto-reverse with Moolre.'],
    ],
  },
};

export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }): Promise<Metadata> {
  const { doc } = await params;
  const d = DOCS[doc];
  return { title: d ? `${d.title} | DigiMart` : 'Not found | DigiMart', description: d ? `${d.title} for DigiMart Ghana — One Marketplace. Every Need.` : undefined };
}

export default async function LegalDoc({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  const d = DOCS[doc];
  if (!d) notFound();
  return <main className="faqSection" style={{ maxWidth: 900, margin: '26px auto', borderRadius: 19 }}>
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <h1 style={{ margin: 0, fontSize: 30, letterSpacing: '-1px' }}>{d.title}</h1>
      <Link className="logo" href="/"><span>Digi</span><b>Mart</b></Link>
    </header>
    <p style={{ color: '#8a97ac', fontSize: 12, fontWeight: 700 }}>Last updated: {d.updated}</p>
    {d.sections.map(([h, body]) => <section key={h} style={{ borderBottom: '1px solid #eef2f9', padding: '14px 2px' }}>
      <h2 style={{ margin: '0 0 6px', fontSize: 16 }}>{h}</h2>
      <p style={{ margin: 0, color: '#4c5a72', fontSize: 14, lineHeight: 1.6 }}>{body}</p>
    </section>)}
    <p style={{ marginTop: 18, fontSize: 13 }}><Link href="/" style={{ color: '#1647a6', fontWeight: 800 }}>← Back to DigiMart</Link></p>
  </main>;
}
