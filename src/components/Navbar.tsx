import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Divider,
  ListItemIcon,
} from "@mui/material";
import {
  Dashboard,
  Assignment,
  People,
  Settings,
  Logout,
  AccountCircle,
  SpaceDashboard,
  MenuBook,
  Inventory,
} from "@mui/icons-material";
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
    handleClose();
  };

  const menuItems = [
    { label: "Painel", path: "/dashboard", icon: <Dashboard /> },
    { label: "Projetos", path: "/projects", icon: <Assignment /> },
    { label: "Sprints", path: "/sprints", icon: <SpaceDashboard /> },
    { label: "Backlog", path: "/backlog", icon: <Inventory /> },
    { label: "Times", path: "/teams", icon: <People /> },
    { label: "Guia Daher Lab", path: "/scrum-guide", icon: <MenuBook /> },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between", py: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <img
            src="/logo_branca_sem_slogan.png"
            alt="Daher Lab"
            style={{ height: "40px", cursor: "pointer" }}
            onClick={() => navigate("/dashboard")}
          />
          <Divider
            orientation="vertical"
            flexItem
            sx={{ bgcolor: "rgba(255,255,255,0.3)" }}
          />
          <Typography
            variant="h6"
            component="div"
            sx={{ fontWeight: 700, display: { xs: "none", sm: "block" } }}
          >
            Dashboard,
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {menuItems.map((item) => (
            <Button
              key={item.path}
              color="inherit"
              startIcon={item.icon}
              onClick={() => navigate(item.path)}
              sx={{
                display: { xs: "none", md: "flex" },
                fontWeight: 600,
                px: 3,
                py: 1,
                borderRadius: 3,
                backgroundColor: isActive(item.path)
                  ? "rgba(255,255,255,0.25)"
                  : "transparent",
                backdropFilter: isActive(item.path) ? "blur(10px)" : "none",
                border: isActive(item.path)
                  ? "1px solid rgba(255,255,255,0.3)"
                  : "1px solid transparent",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.2)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  transform: "translateY(-2px)",
                },
              }}
            >
              {item.label}
            </Button>
          ))}

          <IconButton
            size="large"
            onClick={handleMenu}
            color="inherit"
            sx={{ ml: 2 }}
          >
            {user?.user_metadata?.avatar_url ? (
              <Avatar
                src={user.user_metadata.avatar_url}
                alt={user.user_metadata?.full_name || "User"}
                sx={{ width: 32, height: 32 }}
              />
            ) : (
              <AccountCircle />
            )}
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            keepMounted
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {user?.user_metadata?.full_name || "Usuário"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
            </Box>
            <Divider />
            <MenuItem
              onClick={() => {
                navigate("/settings");
                handleClose();
              }}
            >
              <ListItemIcon>
                <Settings fontSize="small" />
              </ListItemIcon>
              Configurações
            </MenuItem>
            <MenuItem onClick={handleSignOut}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              Sair
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
