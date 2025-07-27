import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';

const FooterContainer = styled.footer`
  background-color: ${props => props.theme.colors.background.accent};
  border-top: 1px solid ${props => props.theme.colors.border};
  padding: 2rem 0 1rem;
  margin-top: auto;
`;

const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    text-align: center;
  }
`;

const FooterSection = styled.div`
  h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: ${props => props.theme.colors.text.primary};
    margin-bottom: 1rem;
  }

  p {
    color: ${props => props.theme.colors.text.secondary};
    line-height: 1.6;
    margin-bottom: 0.5rem;
  }
`;

const FooterLink = styled(Link)`
  color: ${props => props.theme.colors.text.secondary};
  text-decoration: none;
  display: block;
  margin-bottom: 0.5rem;
  transition: color 0.2s ease;

  &:hover {
    color: ${props => props.theme.colors.primary};
  }
`;

const ExternalLink = styled.a`
  color: ${props => props.theme.colors.text.secondary};
  text-decoration: none;
  display: block;
  margin-bottom: 0.5rem;
  transition: color 0.2s ease;

  &:hover {
    color: ${props => props.theme.colors.primary};
  }
`;

const FooterBottom = styled.div`
  border-top: 1px solid ${props => props.theme.colors.border};
  margin-top: 2rem;
  padding-top: 1rem;
  text-align: center;
  color: ${props => props.theme.colors.text.secondary};
  font-size: 0.875rem;
`;

const SocialLinks = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1rem;

  @media (max-width: 768px) {
    justify-content: center;
  }
`;

const SocialLink = styled.a`
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background-color: ${props => props.theme.colors.primary};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.colors.accent};
    transform: translateY(-2px);
  }
`;

export const Footer: React.FC = () => {
  return (
    <FooterContainer>
      <FooterContent>
        <FooterSection>
          <h3>Wedding Memories</h3>
          <p>
            Create beautiful memories that last a lifetime. Share your special moments 
            with loved ones through our easy-to-use photo sharing platform.
          </p>
          <SocialLinks>
            <SocialLink href="#" aria-label="Facebook">
              📘
            </SocialLink>
            <SocialLink href="#" aria-label="Instagram">
              📷
            </SocialLink>
            <SocialLink href="#" aria-label="Twitter">
              🐦
            </SocialLink>
          </SocialLinks>
        </FooterSection>

        <FooterSection>
          <h3>Features</h3>
          <FooterLink to="/">Photo Sharing</FooterLink>
          <FooterLink to="/">QR Code Access</FooterLink>
          <FooterLink to="/">Digital Guestbook</FooterLink>
          <FooterLink to="/">Real-time Slideshow</FooterLink>
          <FooterLink to="/">Event Management</FooterLink>
        </FooterSection>

        <FooterSection>
          <h3>Support</h3>
          <FooterLink to="/">Help Center</FooterLink>
          <FooterLink to="/">Contact Us</FooterLink>
          <FooterLink to="/">Privacy Policy</FooterLink>
          <FooterLink to="/">Terms of Service</FooterLink>
          <ExternalLink href="mailto:support@weddingmemories.com">
            support@weddingmemories.com
          </ExternalLink>
        </FooterSection>

        <FooterSection>
          <h3>Getting Started</h3>
          <FooterLink to="/register">Create Account</FooterLink>
          <FooterLink to="/login">Sign In</FooterLink>
          <FooterLink to="/">Pricing</FooterLink>
          <FooterLink to="/">FAQ</FooterLink>
          <FooterLink to="/">Demo</FooterLink>
        </FooterSection>
      </FooterContent>

      <FooterBottom>
        <p>&copy; 2024 Wedding Memories. All rights reserved.</p>
        <p>Made with 💝 for couples everywhere</p>
      </FooterBottom>
    </FooterContainer>
  );
};