import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const HomeContainer = styled.div`
  min-height: calc(100vh - 4rem);
`;

const HeroSection = styled.section`
  background: linear-gradient(135deg, ${props => props.theme.colors.secondary} 0%, ${props => props.theme.colors.background.accent} 100%);
  padding: 4rem 1rem;
  text-align: center;
`;

const HeroContent = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const HeroTitle = styled.h1`
  font-size: 3.5rem;
  font-weight: 700;
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 1.5rem;
  line-height: 1.2;

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }

  @media (max-width: 480px) {
    font-size: 2rem;
  }
`;

const HeroSubtitle = styled.p`
  font-size: 1.25rem;
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: 2rem;
  line-height: 1.6;

  @media (max-width: 768px) {
    font-size: 1.125rem;
  }
`;

const CTAButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 2rem;
`;

const PrimaryButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  padding: 1rem 2rem;
  background-color: ${props => props.theme.colors.primary};
  color: white;
  text-decoration: none;
  border-radius: ${props => props.theme.borderRadius.lg};
  font-weight: 600;
  font-size: 1.125rem;
  transition: all 0.3s ease;
  box-shadow: ${props => props.theme.shadows.md};

  &:hover {
    background-color: ${props => props.theme.colors.accent};
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.lg};
  }
`;

const SecondaryButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  padding: 1rem 2rem;
  background-color: transparent;
  color: ${props => props.theme.colors.text.primary};
  text-decoration: none;
  border: 2px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.lg};
  font-weight: 600;
  font-size: 1.125rem;
  transition: all 0.3s ease;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    color: ${props => props.theme.colors.primary};
    transform: translateY(-2px);
  }
`;

const FeaturesSection = styled.section`
  padding: 4rem 1rem;
  background-color: ${props => props.theme.colors.background.primary};
`;

const SectionTitle = styled.h2`
  font-size: 2.5rem;
  font-weight: 600;
  text-align: center;
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 3rem;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const FeaturesGrid = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
`;

const FeatureCard = styled.div`
  background-color: ${props => props.theme.colors.background.primary};
  padding: 2rem;
  border-radius: ${props => props.theme.borderRadius.xl};
  box-shadow: ${props => props.theme.shadows.md};
  text-align: center;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${props => props.theme.shadows.lg};
  }
`;

const FeatureIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const FeatureTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 1rem;
`;

const FeatureDescription = styled.p`
  color: ${props => props.theme.colors.text.secondary};
  line-height: 1.6;
`;

const StatsSection = styled.section`
  padding: 4rem 1rem;
  background-color: ${props => props.theme.colors.background.accent};
`;

const StatsGrid = styled.div`
  max-width: 800px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
  text-align: center;
`;

const StatCard = styled.div`
  h3 {
    font-size: 3rem;
    font-weight: 700;
    color: ${props => props.theme.colors.primary};
    margin-bottom: 0.5rem;
  }

  p {
    color: ${props => props.theme.colors.text.secondary};
    font-weight: 500;
  }
`;

const TestimonialSection = styled.section`
  padding: 4rem 1rem;
  background-color: ${props => props.theme.colors.background.primary};
`;

const TestimonialCard = styled.div`
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
  background-color: ${props => props.theme.colors.background.accent};
  padding: 3rem 2rem;
  border-radius: ${props => props.theme.borderRadius.xl};
  box-shadow: ${props => props.theme.shadows.md};
`;

const TestimonialText = styled.blockquote`
  font-size: 1.25rem;
  font-style: italic;
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 1.5rem;
  line-height: 1.6;
`;

const TestimonialAuthor = styled.p`
  font-weight: 600;
  color: ${props => props.theme.colors.primary};
`;

const CTASection = styled.section`
  padding: 4rem 1rem;
  background: linear-gradient(135deg, ${props => props.theme.colors.primary} 0%, ${props => props.theme.colors.accent} 100%);
  text-align: center;
  color: white;
`;

const CTATitle = styled.h2`
  font-size: 2.5rem;
  font-weight: 600;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const CTADescription = styled.p`
  font-size: 1.25rem;
  margin-bottom: 2rem;
  opacity: 0.9;
`;

const CTAButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  padding: 1rem 2rem;
  background-color: white;
  color: ${props => props.theme.colors.primary};
  text-decoration: none;
  border-radius: ${props => props.theme.borderRadius.lg};
  font-weight: 600;
  font-size: 1.125rem;
  transition: all 0.3s ease;
  box-shadow: ${props => props.theme.shadows.md};

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.lg};
  }
`;

const HomePage: React.FC = () => {
  return (
    <HomeContainer>
      <HeroSection>
        <HeroContent>
          <HeroTitle>
            Capture Every Precious Moment ✨
          </HeroTitle>
          <HeroSubtitle>
            Share your wedding memories with family and friends through our beautiful, 
            easy-to-use photo sharing platform. Create lasting memories that everyone can treasure.
          </HeroSubtitle>
          <CTAButtons>
            <PrimaryButton to="/register">
              Start Your Story
            </PrimaryButton>
            <SecondaryButton to="#features">
              Learn More
            </SecondaryButton>
          </CTAButtons>
        </HeroContent>
      </HeroSection>

      <FeaturesSection id="features">
        <SectionTitle>Everything You Need for Perfect Wedding Memories</SectionTitle>
        <FeaturesGrid>
          <FeatureCard>
            <FeatureIcon>📱</FeatureIcon>
            <FeatureTitle>QR Code Access</FeatureTitle>
            <FeatureDescription>
              Guests can instantly access your wedding album by scanning a QR code. 
              No apps to download, no accounts to create - just simple, instant access.
            </FeatureDescription>
          </FeatureCard>

          <FeatureCard>
            <FeatureIcon>📸</FeatureIcon>
            <FeatureTitle>Easy Photo Uploads</FeatureTitle>
            <FeatureDescription>
              Drag and drop photos and videos from any device. Guests can share their 
              perspective of your special day with beautiful, organized albums.
            </FeatureDescription>
          </FeatureCard>

          <FeatureCard>
            <FeatureIcon>💕</FeatureIcon>
            <FeatureTitle>Digital Guestbook</FeatureTitle>
            <FeatureDescription>
              Collect heartfelt messages and audio recordings from your loved ones. 
              Create a digital keepsake that you'll treasure forever.
            </FeatureDescription>
          </FeatureCard>

          <FeatureCard>
            <FeatureIcon>🎥</FeatureIcon>
            <FeatureTitle>Live Slideshow</FeatureTitle>
            <FeatureDescription>
              Display a real-time slideshow of uploaded photos during your reception. 
              Watch memories unfold as guests share their favorite moments.
            </FeatureDescription>
          </FeatureCard>

          <FeatureCard>
            <FeatureIcon>🔒</FeatureIcon>
            <FeatureTitle>Privacy Controls</FeatureTitle>
            <FeatureDescription>
              Your memories are safe with advanced privacy settings. Control who can 
              view and upload, with optional password protection.
            </FeatureDescription>
          </FeatureCard>

          <FeatureCard>
            <FeatureIcon>📱</FeatureIcon>
            <FeatureTitle>Mobile Friendly</FeatureTitle>
            <FeatureDescription>
              Perfect experience on all devices. Whether on mobile, tablet, or desktop, 
              sharing and viewing memories is always beautiful and easy.
            </FeatureDescription>
          </FeatureCard>
        </FeaturesGrid>
      </FeaturesSection>

      <StatsSection>
        <SectionTitle>Trusted by Happy Couples</SectionTitle>
        <StatsGrid>
          <StatCard>
            <h3>10K+</h3>
            <p>Weddings Celebrated</p>
          </StatCard>
          <StatCard>
            <h3>1M+</h3>
            <p>Photos Shared</p>
          </StatCard>
          <StatCard>
            <h3>50K+</h3>
            <p>Happy Guests</p>
          </StatCard>
          <StatCard>
            <h3>99%</h3>
            <p>Satisfaction Rate</p>
          </StatCard>
        </StatsGrid>
      </StatsSection>

      <TestimonialSection>
        <SectionTitle>What Couples Are Saying</SectionTitle>
        <TestimonialCard>
          <TestimonialText>
            "Wedding Memories made it so easy for all our guests to share photos. 
            We have hundreds of beautiful memories from different perspectives that 
            we never would have seen otherwise. It's absolutely magical!"
          </TestimonialText>
          <TestimonialAuthor>- Sarah & Michael Johnson</TestimonialAuthor>
        </TestimonialCard>
      </TestimonialSection>

      <CTASection>
        <CTATitle>Ready to Create Beautiful Memories?</CTATitle>
        <CTADescription>
          Join thousands of couples who have made their wedding unforgettable
        </CTADescription>
        <CTAButton to="/register">
          Get Started Free
        </CTAButton>
      </CTASection>
    </HomeContainer>
  );
};

export default HomePage;