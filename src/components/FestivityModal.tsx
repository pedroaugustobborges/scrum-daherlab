import React from "react";
import {
  Dialog,
  Box,
  Typography,
  Avatar,
  IconButton,
  Slide,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { TransitionProps } from "@mui/material/transitions";
import { type Festivity } from "@/config/festivities";

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement<any, any> },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function getDaysLeft(targetDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

// --------------- Bounce animation (soccer balls, stars, confetti…) ---------------
function BounceAnimation({ emoji }: { emoji: string }) {
  const items = [
    { delay: "0s",    duration: "2.8s", left: "5%",  size: 22 },
    { delay: "0.4s",  duration: "3.2s", left: "20%", size: 18 },
    { delay: "0.8s",  duration: "2.5s", left: "38%", size: 26 },
    { delay: "1.2s",  duration: "3.6s", left: "56%", size: 20 },
    { delay: "0.2s",  duration: "2.9s", left: "72%", size: 24 },
    { delay: "0.6s",  duration: "3.1s", left: "88%", size: 18 },
  ];

  return (
    <Box sx={{ position: "relative", height: 72, my: 2, overflow: "hidden" }}>
      <style>{`
        @keyframes festBounce {
          0%   { transform: translateY(48px) rotate(0deg);   opacity: 0.9; }
          40%  { transform: translateY(0px)  rotate(120deg); opacity: 1;   }
          60%  { transform: translateY(8px)  rotate(200deg); opacity: 1;   }
          80%  { transform: translateY(0px)  rotate(280deg); opacity: 1;   }
          100% { transform: translateY(48px) rotate(360deg); opacity: 0.9; }
        }
      `}</style>
      {items.map((b, i) => (
        <Box
          key={i}
          component="span"
          sx={{
            position: "absolute",
            left: b.left,
            fontSize: b.size,
            lineHeight: 1,
            animation: `festBounce ${b.duration} ease-in-out infinite`,
            animationDelay: b.delay,
          }}
        >
          {emoji}
        </Box>
      ))}
    </Box>
  );
}

// --------------- Fall animation (snow, sparkles, stars…) ---------------
function FallAnimation({ emoji }: { emoji: string }) {
  const items = [
    { delay: "0s",   duration: "3s",   left: "4%",  size: 20 },
    { delay: "0.5s", duration: "2.5s", left: "15%", size: 14 },
    { delay: "1s",   duration: "3.5s", left: "28%", size: 22 },
    { delay: "0.3s", duration: "2.8s", left: "42%", size: 16 },
    { delay: "1.4s", duration: "3.2s", left: "55%", size: 20 },
    { delay: "0.7s", duration: "2.6s", left: "68%", size: 14 },
    { delay: "1.8s", duration: "3.4s", left: "80%", size: 18 },
    { delay: "0.1s", duration: "2.9s", left: "92%", size: 22 },
  ];

  return (
    <Box sx={{ position: "relative", height: 72, my: 2, overflow: "hidden" }}>
      <style>{`
        @keyframes festFall {
          0%   { transform: translateY(-10px) rotate(0deg);  opacity: 0;   }
          10%  { opacity: 1; }
          90%  { opacity: 0.8; }
          100% { transform: translateY(72px)  rotate(360deg); opacity: 0; }
        }
      `}</style>
      {items.map((f, i) => (
        <Box
          key={i}
          component="span"
          sx={{
            position: "absolute",
            left: f.left,
            fontSize: f.size,
            lineHeight: 1,
            animation: `festFall ${f.duration} ease-in infinite`,
            animationDelay: f.delay,
          }}
        >
          {emoji}
        </Box>
      ))}
    </Box>
  );
}

// --------------- Main modal ---------------
interface FestivityModalProps {
  festivity: Festivity | null;
  open: boolean;
  onClose: () => void;
}

export default function FestivityModal({ festivity, open, onClose }: FestivityModalProps) {
  if (!festivity) return null;

  const daysLeft = getDaysLeft(festivity.targetDate);
  const message = festivity.adaMessage(daysLeft);
  const { gradientStart, gradientEnd } = festivity;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      TransitionComponent={Transition}
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: "hidden",
          background: `linear-gradient(160deg, ${gradientStart}20 0%, ${gradientEnd}20 100%)`,
          border: `2px solid ${gradientStart}55`,
          boxShadow: `0 25px 50px -12px ${gradientStart}60`,
        },
      }}
      sx={{
        "& .MuiBackdrop-root": {
          backdropFilter: "blur(8px)",
          backgroundColor: "rgba(0,0,0,0.55)",
        },
      }}
    >
      {/* ---- Header ---- */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 100%)`,
          pt: 4,
          pb: 3,
          px: 3,
          textAlign: "center",
          position: "relative",
        }}
      >
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            color: "white",
            backgroundColor: "rgba(0,0,0,0.18)",
            "&:hover": { backgroundColor: "rgba(0,0,0,0.32)" },
          }}
        >
          <Close fontSize="small" />
        </IconButton>

        <Avatar
          src="/ADA.png"
          alt="Ada"
          sx={{
            width: 80,
            height: 80,
            mx: "auto",
            mb: 1.5,
            border: "3px solid white",
            boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
          }}
        />

        <Typography
          variant="h5"
          fontWeight={800}
          sx={{
            color: "white",
            textShadow: "0 2px 6px rgba(0,0,0,0.25)",
            lineHeight: 1.2,
          }}
        >
          Ada {festivity.adaExpression}
        </Typography>

        <Typography
          variant="caption"
          sx={{ color: "rgba(255,255,255,0.88)", fontWeight: 600, letterSpacing: 0.5 }}
        >
          {festivity.name}
        </Typography>
      </Box>

      {/* ---- Body ---- */}
      <Box sx={{ px: 3, pt: 3, pb: 3, textAlign: "center" }}>
        {/* Countdown pill */}
        {daysLeft > 0 && (
          <Box
            sx={{
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "center",
              background: `linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 100%)`,
              borderRadius: 3,
              px: 4,
              py: 1.5,
              mb: 0.5,
              boxShadow: `0 8px 24px ${gradientStart}55`,
            }}
          >
            <Typography
              variant="h2"
              fontWeight={900}
              sx={{
                color: "white",
                lineHeight: 1,
                textShadow: "0 2px 4px rgba(0,0,0,0.2)",
              }}
            >
              {daysLeft}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 700 }}
            >
              dias {festivity.countdownSuffix}
            </Typography>
          </Box>
        )}

        {/* Particle animation */}
        {festivity.animationType === "bounce" && (
          <BounceAnimation emoji={festivity.animationEmoji} />
        )}
        {festivity.animationType === "fall" && (
          <FallAnimation emoji={festivity.animationEmoji} />
        )}

        {/* Ada's speech bubble — gradient background so the white text is readable */}
        <Box
          sx={{
            background: `linear-gradient(135deg, ${gradientStart}E8 0%, ${gradientEnd}D0 100%)`,
            borderRadius: 3,
            p: 2.5,
            mt: 0.5,
            position: "relative",
            boxShadow: `0 4px 16px ${gradientStart}35`,
          }}
        >
          {/* Triangle pointer */}
          <Box
            sx={{
              position: "absolute",
              top: -8,
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "8px solid transparent",
              borderRight: "8px solid transparent",
              borderBottom: `8px solid ${gradientStart}E8`,
            }}
          />
          <Typography
            variant="body1"
            fontWeight={600}
            sx={{ color: "white", lineHeight: 1.75, fontStyle: "italic", textShadow: "0 1px 3px rgba(0,0,0,0.2)" }}
          >
            "{message}"
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: "rgba(255,255,255,0.8)", fontWeight: 700, mt: 1, display: "block" }}
          >
            — Ada, sua assistente
          </Typography>
        </Box>
      </Box>
    </Dialog>
  );
}
