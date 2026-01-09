import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  IconButton,
  InputAdornment,
} from "@mui/material";
import {
  VisibilityOutlined,
  VisibilityOffOutlined,
  EmailOutlined,
  LockOutlined,
} from "@mui/icons-material";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao entrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e293b 25%, #0d4d63 50%, #1e3a5f 75%, #1a1f3a 100%)",
        padding: 3,
        position: "relative",
        overflow: "hidden",
        // Animated gradient orbs representing agile iterations
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 15% 20%, rgba(6, 182, 212, 0.15) 0%, transparent 40%),
            radial-gradient(circle at 85% 80%, rgba(99, 102, 241, 0.12) 0%, transparent 45%),
            radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 70% 30%, rgba(139, 92, 246, 0.1) 0%, transparent 40%)
          `,
          animation: "orbPulse 15s ease-in-out infinite",
        },
        // Grid pattern representing sprints and structure
        "&::after": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            linear-gradient(rgba(6, 182, 212, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.03) 1px, transparent 1px),
            linear-gradient(rgba(99, 102, 241, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99, 102, 241, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: "100px 100px, 100px 100px, 20px 20px, 20px 20px",
          backgroundPosition: "-1px -1px, -1px -1px, -1px -1px, -1px -1px",
          animation: "gridFlow 20s linear infinite",
        },
        "@keyframes orbPulse": {
          "0%, 100%": {
            transform: "scale(1) translate(0, 0)",
            opacity: 1,
          },
          "33%": {
            transform: "scale(1.1) translate(-5%, 5%)",
            opacity: 0.8,
          },
          "66%": {
            transform: "scale(0.95) translate(5%, -5%)",
            opacity: 0.9,
          },
        },
        "@keyframes gridFlow": {
          "0%": {
            transform: "translate(0, 0)",
          },
          "100%": {
            transform: "translate(20px, 20px)",
          },
        },
        "@keyframes float": {
          "0%, 100%": {
            transform: "translateY(0) rotate(0deg)",
          },
          "50%": {
            transform: "translateY(-20px) rotate(5deg)",
          },
        },
        "@keyframes pulse": {
          "0%, 100%": {
            opacity: 0.4,
            transform: "scale(1)",
          },
          "50%": {
            opacity: 0.8,
            transform: "scale(1.05)",
          },
        },
      }}
    >
      {/* Floating medical/agile themed elements */}
      <Box
        sx={{
          position: "absolute",
          top: "10%",
          left: "8%",
          width: "120px",
          height: "120px",
          border: "2px solid rgba(6, 182, 212, 0.2)",
          borderRadius: "50%",
          animation:
            "float 8s ease-in-out infinite, pulse 4s ease-in-out infinite",
          "&::before": {
            content: '""',
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "60%",
            height: "60%",
            border: "2px solid rgba(6, 182, 212, 0.3)",
            borderRadius: "50%",
          },
        }}
      />
      <Box
        sx={{
          position: "absolute",
          bottom: "15%",
          right: "10%",
          width: "100px",
          height: "100px",
          border: "2px solid rgba(99, 102, 241, 0.2)",
          borderRadius: "30% 70% 70% 30% / 30% 30% 70% 70%",
          animation:
            "float 10s ease-in-out infinite 2s, pulse 5s ease-in-out infinite 1s",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          top: "60%",
          left: "15%",
          width: "80px",
          height: "80px",
          border: "2px solid rgba(16, 185, 129, 0.2)",
          borderRadius: "50%",
          animation:
            "float 12s ease-in-out infinite 4s, pulse 6s ease-in-out infinite 2s",
        }}
      />
      {/* Pulse lines representing health monitoring */}
      <Box
        sx={{
          position: "absolute",
          top: "30%",
          right: "5%",
          width: "200px",
          height: "2px",
          background:
            "linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.5), transparent)",
          animation: "pulse 3s ease-in-out infinite",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          bottom: "40%",
          left: "3%",
          width: "180px",
          height: "2px",
          background:
            "linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.5), transparent)",
          animation: "pulse 4s ease-in-out infinite 1.5s",
        }}
      />
      <Card
        sx={{
          maxWidth: 520,
          width: "100%",
          borderRadius: 6,
          boxShadow:
            "0 40px 80px -12px rgba(6, 182, 212, 0.3), 0 20px 40px -10px rgba(99, 102, 241, 0.2), 0 0 0 1px rgba(6, 182, 212, 0.1)",
          backdropFilter: "blur(40px) saturate(180%)",
          background:
            "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)",
          border: "1px solid rgba(6, 182, 212, 0.2)",
          position: "relative",
          zIndex: 1,
          transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          "&:hover": {
            boxShadow:
              "0 50px 100px -12px rgba(6, 182, 212, 0.4), 0 25px 50px -10px rgba(99, 102, 241, 0.3), 0 0 0 1px rgba(6, 182, 212, 0.2)",
            transform: "translateY(-6px)",
          },
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            borderRadius: 6,
            padding: "2px",
            background:
              "linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(99, 102, 241, 0.3), rgba(16, 185, 129, 0.2))",
            WebkitMask:
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            pointerEvents: "none",
          },
        }}
      >
        <CardContent sx={{ p: 6 }}>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 6 }}>
            <img
              src="/logo-daherlab.png"
              alt="Daher Lab"
              style={{
                maxWidth: "280px",
                height: "auto",
                filter: "drop-shadow(0 4px 12px rgba(99, 102, 241, 0.15))",
                transition: "all 0.3s ease",
              }}
            />
          </Box>

          <Typography
            variant="h3"
            component="h1"
            gutterBottom
            align="center"
            sx={{
              fontWeight: 800,
              background:
                "linear-gradient(135deg, #06b6d4 0%, #6366f1 50%, #10b981 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              mb: 2,
              letterSpacing: "-0.02em",
              filter: "drop-shadow(0 2px 8px rgba(6, 182, 212, 0.3))",
              lineHeight: 1.4, // Dá mais espaço vertical para a fonte
              paddingBottom: "10px", // Garante que o corte do container não pegue a sombra/letra
            }}
          >
            agir ágil
          </Typography>

          <Typography
            variant="body1"
            align="center"
            sx={{
              mb: 6,
              fontWeight: 500,
              color: "rgba(71, 85, 105, 0.8)",
              fontSize: "1.1rem",
              letterSpacing: "0.02em",
            }}
          >
            {/* Agir é ágil */}
          </Typography>

          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: 3,
                backdropFilter: "blur(12px)",
                background: "rgba(254, 226, 226, 0.8)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#dc2626",
                "& .MuiAlert-icon": {
                  color: "#dc2626",
                },
              }}
            >
              {error}
            </Alert>
          )}

          <form onSubmit={handleSignIn}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                margin="normal"
                autoComplete="email"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailOutlined sx={{ color: "rgba(6, 182, 212, 0.6)" }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 3,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                    backgroundColor: "rgba(255, 255, 255, 0.7)",
                    backdropFilter: "blur(12px)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    "& fieldset": {
                      borderColor: "rgba(6, 182, 212, 0.25)",
                      borderWidth: "1.5px",
                      transition: "all 0.3s ease",
                    },
                    "&:hover fieldset": {
                      borderColor: "rgba(6, 182, 212, 0.5)",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#06b6d4",
                      borderWidth: "2px",
                    },
                    "&.Mui-focused": {
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      boxShadow: "0 0 0 4px rgba(6, 182, 212, 0.15)",
                    },
                  },
                  "& .MuiInputLabel-root": {
                    color: "rgba(71, 85, 105, 0.7)",
                    "&.Mui-focused": {
                      color: "#06b6d4",
                    },
                  },
                  "& .MuiInputBase-input": {
                    color: "rgba(15, 23, 42, 0.95)",
                    padding: "16px 14px",
                  },
                }}
              />
              <TextField
                fullWidth
                label="Senha"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                margin="normal"
                autoComplete="current-password"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlined sx={{ color: "rgba(6, 182, 212, 0.6)" }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{
                          color: "rgba(6, 182, 212, 0.6)",
                          transition: "all 0.2s ease",
                          "&:hover": {
                            color: "#06b6d4",
                            backgroundColor: "rgba(6, 182, 212, 0.1)",
                          },
                        }}
                      >
                        {showPassword ? (
                          <VisibilityOffOutlined />
                        ) : (
                          <VisibilityOutlined />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 3,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                    backgroundColor: "rgba(255, 255, 255, 0.7)",
                    backdropFilter: "blur(12px)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    "& fieldset": {
                      borderColor: "rgba(6, 182, 212, 0.25)",
                      borderWidth: "1.5px",
                      transition: "all 0.3s ease",
                    },
                    "&:hover fieldset": {
                      borderColor: "rgba(6, 182, 212, 0.5)",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#06b6d4",
                      borderWidth: "2px",
                    },
                    "&.Mui-focused": {
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      boxShadow: "0 0 0 4px rgba(6, 182, 212, 0.15)",
                    },
                  },
                  "& .MuiInputLabel-root": {
                    color: "rgba(71, 85, 105, 0.7)",
                    "&.Mui-focused": {
                      color: "#06b6d4",
                    },
                  },
                  "& .MuiInputBase-input": {
                    color: "rgba(15, 23, 42, 0.95)",
                    padding: "16px 14px",
                  },
                }}
              />
              <Button
                fullWidth
                variant="contained"
                type="submit"
                disabled={loading}
                sx={{
                  mt: 2,
                  mb: 2,
                  py: 2,
                  fontSize: "1rem",
                  fontWeight: 600,
                  borderRadius: 3,
                  textTransform: "none",
                  letterSpacing: "0.5px",
                  background:
                    "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #6366f1 100%)",
                  boxShadow:
                    "0 8px 24px rgba(6, 182, 212, 0.4), 0 4px 12px rgba(99, 102, 241, 0.3)",
                  color: "#ffffff",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #0891b2 0%, #2563eb 50%, #4f46e5 100%)",
                    boxShadow:
                      "0 12px 32px rgba(6, 182, 212, 0.5), 0 6px 16px rgba(99, 102, 241, 0.4)",
                    transform: "translateY(-2px)",
                  },
                  "&:active": {
                    transform: "translateY(0)",
                  },
                  "&.Mui-disabled": {
                    background: "rgba(99, 102, 241, 0.2)",
                    color: "rgba(71, 85, 105, 0.4)",
                  },
                }}
              >
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
        </CardContent>
      </Card>
    </Box>
  );
}
