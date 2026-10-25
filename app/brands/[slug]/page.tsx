import { notFound } from "next/navigation";
import { Container } from "@mui/material";
import { BRANDS, getBrand } from "@/lib/brands/config";
import { brandContentRegistry } from "@/lib/brands/content-registry";
import { ComingSoon } from "@/components/brands/ComingSoon";
import { Responsive } from "@/components/mobile/Responsive";
import { MobileBrandDetail } from "@/components/mobile/MobileBrandDetail";

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
 * charts and zeroes. On a phone the same brand is its own searchable list of
 * offers instead, which needs no per-brand content to be useful.
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
    <Responsive
      mobile={<MobileBrandDetail brand={brand} />}
      desktop={
        <Container maxWidth="xl" sx={{ py: 4, px: { xs: 2, md: 3 } }}>
          {Content ? Content() : <ComingSoon brand={brand} />}
        </Container>
      }
    />
  );
}
