import { notFound } from "next/navigation";
import { Container } from "@mui/material";
import { BRANDS, getBrand } from "@/lib/brands/config";
import { brandContentRegistry } from "@/lib/brands/content-registry";
import { ComingSoon } from "@/components/brands/ComingSoon";

export async function generateStaticParams() {
  return BRANDS.map((b) => ({ slug: b.slug }));
}

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
