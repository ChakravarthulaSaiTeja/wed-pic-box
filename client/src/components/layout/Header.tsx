import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../../context/AuthContext';

const HeaderContainer = styled.header`
  background-color: ${props => props.theme.colors.background.primary};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  padding: 0;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: ${props => props.theme.shadows.sm};
`;

const HeaderContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 4rem;

  @media (max-width: 768px) {
    padding: 0 0.75rem;
  }
`;

const Logo = styled(Link)`
  font-family: ${props => props.theme.fonts.heading};
  font-size: 1.5rem;
  font-weight: 600;
  color: ${props => props.theme.colors.primary};
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    color: ${props => props.theme.colors.accent};
  }
`;

const Nav = styled.nav<{ isOpen: boolean }>`
  display: flex;
  align-items: center;
  gap: 2rem;

  @media (max-width: 768px) {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background-color: ${props => props.theme.colors.background.primary};
    border-bottom: 1px solid ${props => props.theme.colors.border};
    flex-direction: column;
    padding: 1rem;
    gap: 1rem;
    transform: translateY(${props => props.isOpen ? '0' : '-100%'});
    opacity: ${props => props.isOpen ? '1' : '0'};
    visibility: ${props => props.isOpen ? 'visible' : 'hidden'};
    transition: all 0.3s ease;
  }
`;

const NavLink = styled(Link)`
  color: ${props => props.theme.colors.text.primary};
  text-decoration: none;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: ${props => props.theme.borderRadius.md};
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.colors.background.accent};
    color: ${props => props.theme.colors.primary};
  }
`;

const AuthSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const UserMenu = styled.div`
  position: relative;
`;

const UserButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: ${props => props.theme.borderRadius.md};
  background-color: transparent;
  color: ${props => props.theme.colors.text.primary};
  font-weight: 500;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.colors.background.accent};
  }
`;

const UserAvatar = styled.div`
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background-color: ${props => props.theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
`;

const DropdownMenu = styled.div<{ isOpen: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.25rem;
  background-color: ${props => props.theme.colors.background.primary};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.lg};
  box-shadow: ${props => props.theme.shadows.lg};
  min-width: 12rem;
  padding: 0.5rem 0;
  transform: translateY(${props => props.isOpen ? '0' : '-8px'});
  opacity: ${props => props.isOpen ? '1' : '0'};
  visibility: ${props => props.isOpen ? 'visible' : 'hidden'};
  transition: all 0.2s ease;
  z-index: 50;
`;

const DropdownItem = styled.button`
  width: 100%;
  text-align: left;
  padding: 0.75rem 1rem;
  color: ${props => props.theme.colors.text.primary};
  background-color: transparent;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.colors.background.accent};
  }
`;

const MobileMenuButton = styled.button`
  display: none;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
  background-color: transparent;
  border: none;
  cursor: pointer;

  @media (max-width: 768px) {
    display: flex;
  }
`;

const MenuLine = styled.div<{ isOpen: boolean }>`
  width: 1.5rem;
  height: 2px;
  background-color: ${props => props.theme.colors.text.primary};
  border-radius: 1px;
  transition: all 0.3s ease;

  &:nth-child(1) {
    transform: ${props => props.isOpen ? 'rotate(45deg) translate(6px, 6px)' : 'none'};
  }

  &:nth-child(2) {
    opacity: ${props => props.isOpen ? '0' : '1'};
  }

  &:nth-child(3) {
    transform: ${props => props.isOpen ? 'rotate(-45deg) translate(6px, -6px)' : 'none'};
  }
`;

const Button = styled(Link)`
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: ${props => props.theme.colors.primary};
  color: white;
  text-decoration: none;
  border-radius: ${props => props.theme.borderRadius.md};
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.colors.accent};
    transform: translateY(-1px);
  }
`;

export const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    navigate('/');
  };

  const getUserInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <HeaderContainer>
      <HeaderContent>
        <Logo to="/">
          💒 Wedding Memories
        </Logo>

        <Nav isOpen={isMenuOpen}>
          <NavLink to="/" onClick={() => setIsMenuOpen(false)}>
            Home
          </NavLink>
          
          {isAuthenticated && (
            <NavLink to="/dashboard" onClick={() => setIsMenuOpen(false)}>
              Dashboard
            </NavLink>
          )}
        </Nav>

        <AuthSection>
          {isAuthenticated && user ? (
            <UserMenu>
              <UserButton onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}>
                <UserAvatar>
                  {getUserInitials(user.firstName, user.lastName)}
                </UserAvatar>
                <span>{user.firstName}</span>
              </UserButton>
              
              <DropdownMenu isOpen={isUserMenuOpen}>
                <DropdownItem onClick={() => {
                  setIsUserMenuOpen(false);
                  navigate('/dashboard');
                }}>
                  Dashboard
                </DropdownItem>
                <DropdownItem onClick={() => {
                  setIsUserMenuOpen(false);
                  // Navigate to profile page when implemented
                }}>
                  Profile
                </DropdownItem>
                <DropdownItem onClick={handleLogout}>
                  Logout
                </DropdownItem>
              </DropdownMenu>
            </UserMenu>
          ) : (
            <>
              <NavLink to="/login">Sign In</NavLink>
              <Button to="/register">Get Started</Button>
            </>
          )}

          <MobileMenuButton onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <MenuLine isOpen={isMenuOpen} />
            <MenuLine isOpen={isMenuOpen} />
            <MenuLine isOpen={isMenuOpen} />
          </MobileMenuButton>
        </AuthSection>
      </HeaderContent>
    </HeaderContainer>
  );
};