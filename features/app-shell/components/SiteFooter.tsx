import { Box, Container, Stack, Typography } from "@mui/material";
import AcUnitRoundedIcon from "@mui/icons-material/AcUnitRounded";
import { APP_NAME } from "@/features/app-shell/constants";
import { COLORS } from "@/shared/design/tokens";

export const SiteFooter = () => {
  return (
    <Box
      component="footer"
      sx={{ display: { xs: "none", md: "block" }, borderTop: "1px solid", borderColor: "divider", mt: 6, py: 3 }}
    >
      <Container maxWidth="xl" sx={{ px: { xs: 2, md: 3 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <AcUnitRoundedIcon fontSize="small" sx={{ color: COLORS.skySoft }} />
            <Typography variant="body2" color="text.secondary">
              {APP_NAME} — ski holiday prices, compared across operators.
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Snapshots refresh daily at 02:00 (Israel time).
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
};
