import { notFound } from "next/navigation";
import { Container } from "@mui/material";
import { BRANDS, getBrand } from "@/lib/brands/config";
import { brandContentRegistry } from "@/lib/brands/content-registry";
import { ComingSoon } from "@/components/brands/ComingSoon";

/** Pre-renders one page per configured brand; an unlisted slug still 404s at
 *  request time through getBrand() below. */
export async function generateStaticParams() {
  return BRANDS.map((b) => ({ slug: b.slug }));
}

/**
 * One operator's page. `params` is awaited because Next 16 hands route params
 * in as a promise.
 *
 * A brand can be configured without page content — either no registry entry or
 * hasContent false — and that renders ComingSoon rather than a page of empty
 * charts and zeroes.
 */
export default async function BrandPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const brand = getBrand(slug);

  if (!brand) notFound();

  const Content = brand.hasContent ? brandContentRegistry[brand.slug] : undefined;

  return (
    <Container maxWidth="xl" sx={{ py: 4, px: { xs: 2, md: 3 } }}>
      {Content ? Content() : <ComingSoon brand={brand} />}
    </Container>
  );
}
