import {
  Box,
  Chip,
  Collapse,
  TextField,
  Typography,
  type SxProps,
  type Theme,
} from "@mui/material";
import { PauseCircle } from "@mui/icons-material";

interface OnHoldReasonFieldProps {
  /** Controls the slide-in Collapse — pass `status === 'on-hold'` from the parent. */
  visible: boolean;
  value: string;
  onChange: (value: string) => void;
  /** Override the wrapping Box's sx (e.g. to strip the default mt: 2 inside a Grid). */
  sx?: SxProps<Theme>;
}

/**
 * Reusable amber panel that slides in whenever a project is set to "Em Espera".
 * Owns all copy, styling, validation feedback, and the Collapse animation.
 *
 * Usage:
 *   <OnHoldReasonField
 *     visible={status === 'on-hold'}
 *     value={onHoldReason}
 *     onChange={setOnHoldReason}
 *   />
 */
export default function OnHoldReasonField({
  visible,
  value,
  onChange,
  sx,
}: OnHoldReasonFieldProps) {
  const hasError = visible && !value.trim();

  return (
    <Collapse in={visible} unmountOnExit>
      <Box
        sx={{
          mt: 2,
          p: 2,
          borderRadius: 2,
          border: "1.5px solid",
          borderColor: "rgba(245, 158, 11, 0.4)",
          bgcolor: "rgba(245, 158, 11, 0.04)",
          ...sx,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <PauseCircle sx={{ color: "#f59e0b", fontSize: 18 }} />
          <Typography
            variant="body2"
            fontWeight={600}
            sx={{ color: "#b45309" }}
          >
            Motivo da Espera
          </Typography>
          <Chip
            label="Obrigatório"
            size="small"
            sx={{
              height: 18,
              fontSize: "0.6rem",
              bgcolor: "rgba(245, 158, 11, 0.12)",
              color: "#b45309",
            }}
          />
        </Box>

        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder="Ex: Aguardando aprovação orçamentária da diretoria..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          error={hasError}
          helperText={
            hasError
              ? "Escreva de forma profissional, pois a Ada enviará essa informação para todo o time."
              : ""
          }
          sx={{
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "rgba(245, 158, 11, 0.35)" },
              "&:hover fieldset": { borderColor: "#f59e0b" },
              "&.Mui-focused fieldset": { borderColor: "#f59e0b" },
            },
          }}
        />
      </Box>
    </Collapse>
  );
}
