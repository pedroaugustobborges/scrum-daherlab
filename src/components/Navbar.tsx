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
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
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
  AdminPanelSettings,
  Menu as MenuIcon,
  Close,
} from "@mui/icons-material";
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

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
    { label: "Daher Lab", path: "/scrum-guide", icon: <MenuBook /> },
  ];

  // Add admin menu item if user is admin
  if (isAdmin) {
    menuItems.push({
      label: "Admin",
      path: "/admin",
      icon: <AdminPanelSettings />,
    });
  }

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
        {/* Mobile menu button */}
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ display: { md: "none" }, mr: 1 }}
        >
          <MenuIcon />
        </IconButton>

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
            sx={{ bgcolor: "rgba(255,255,255,0.3)", display: { xs: "none", sm: "block" } }}
          />
          <Typography
            variant="h6"
            component="div"
            sx={{ fontWeight: 750, display: { xs: "none", sm: "block" } }}
          >
            agir ágil
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
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {user?.user_metadata?.full_name || "Usuário"}
                </Typography>
                {isAdmin && (
                  <Box
                    sx={{
                      px: 1,
                      py: 0.25,
                      bgcolor: "rgba(220, 38, 38, 0.1)",
                      borderRadius: 1,
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      color: "#dc2626",
                    }}
                  >
                    ADMIN
                  </Box>
                )}
              </Box>
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
            </Box>
            <Divider />
            {isAdmin && (
              <MenuItem
                onClick={() => {
                  navigate("/admin");
                  handleClose();
                }}
                sx={{
                  color: "#dc2626",
                  "&:hover": {
                    bgcolor: "rgba(220, 38, 38, 0.05)",
                  },
                }}
              >
                <ListItemIcon>
                  <AdminPanelSettings
                    fontSize="small"
                    sx={{ color: "#dc2626" }}
                  />
                </ListItemIcon>
                Painel Admin
              </MenuItem>
            )}
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

      {/* Mobile Navigation Drawer */}
      <Drawer
        variant="temporary"
        anchor="left"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: 280,
            background: "linear-gradient(180deg, #6366f1 0%, #8b5cf6 100%)",
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <img
              src="/logo_branca_sem_slogan.png"
              alt="Daher Lab"
              style={{ height: "36px" }}
            />
            <IconButton color="inherit" onClick={handleDrawerToggle} sx={{ color: "white" }}>
              <Close />
            </IconButton>
          </Box>
          <Divider sx={{ bgcolor: "rgba(255,255,255,0.2)", mb: 2 }} />
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.path} disablePadding sx={{ mb: 1 }}>
                <ListItemButton
                  onClick={() => {
                    navigate(item.path);
                    handleDrawerToggle();
                  }}
                  sx={{
                    borderRadius: 2,
                    color: "white",
                    backgroundColor: isActive(item.path)
                      ? "rgba(255,255,255,0.25)"
                      : "transparent",
                    "&:hover": {
                      backgroundColor: "rgba(255,255,255,0.15)",
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: "white", minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ fontWeight: isActive(item.path) ? 700 : 500 }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider sx={{ bgcolor: "rgba(255,255,255,0.2)", my: 2 }} />
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
              Conectado como
            </Typography>
            <Typography variant="subtitle2" sx={{ color: "white", fontWeight: 600 }}>
              {user?.user_metadata?.full_name || user?.email}
            </Typography>
          </Box>
        </Box>
      </Drawer>
    </AppBar>
  );
}
