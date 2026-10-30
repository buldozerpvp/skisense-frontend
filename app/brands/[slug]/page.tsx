import { notFound } from "next/navigation";
import { Container } from "@mui/material";
import { BRANDS, getBrand } from "@/features/brands/constants";
import { brandContentRegistry } from "@/features/brands/lib/brandContent";
import { ComingSoon } from "@/features/brands/components/ComingSoon";
import { Responsive } from "@/features/app-shell/components/Responsive";
import { BrandScreen } from "@/features/brands/components/BrandScreen";

export const generateStaticParams = async () => {
  return BRANDS.map((b) => ({ slug: b.slug }));
};

const BrandPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;
  const brand = getBrand(slug);

  if (!brand) notFound();

  const Content = brand.hasContent ? brandContentRegistry[brand.slug] : undefined;

  return (
    <Responsive
      mobile={<BrandScreen brand={brand} />}
      desktop={
        <Container maxWidth="xl" sx={{ py: 4, px: { xs: 2, md: 3 } }}>
          {Content ? Content() : <ComingSoon brand={brand} />}
        </Container>
      }
    />
  );
};

export default BrandPage;
