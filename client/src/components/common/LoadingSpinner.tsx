import React from 'react';
import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const SpinnerContainer = styled.div<{ fullScreen?: boolean }>`
  display: flex;
  justify-content: center;
  align-items: center;
  ${props => props.fullScreen && `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(255, 255, 255, 0.9);
    z-index: 9999;
  `}
  ${props => !props.fullScreen && `
    padding: 2rem;
  `}
`;

const Spinner = styled.div<{ size?: 'small' | 'medium' | 'large' }>`
  border: ${props => {
    const sizes = { small: '2px', medium: '3px', large: '4px' };
    return sizes[props.size || 'medium'];
  }} solid ${props => props.theme.colors.background.secondary};
  border-top: ${props => {
    const sizes = { small: '2px', medium: '3px', large: '4px' };
    return sizes[props.size || 'medium'];
  }} solid ${props => props.theme.colors.primary};
  border-radius: 50%;
  width: ${props => {
    const sizes = { small: '20px', medium: '40px', large: '60px' };
    return sizes[props.size || 'medium'];
  }};
  height: ${props => {
    const sizes = { small: '20px', medium: '40px', large: '60px' };
    return sizes[props.size || 'medium'];
  }};
  animation: ${spin} 1s linear infinite;
`;

const LoadingText = styled.p`
  margin-top: 1rem;
  color: ${props => props.theme.colors.text.secondary};
  font-size: 0.875rem;
`;

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  fullScreen = false, 
  text 
}) => {
  return (
    <SpinnerContainer fullScreen={fullScreen}>
      <div>
        <Spinner size={size} />
        {text && <LoadingText>{text}</LoadingText>}
      </div>
    </SpinnerContainer>
  );
};