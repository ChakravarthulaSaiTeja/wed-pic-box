import React from 'react';
import styled from 'styled-components';

const RegisterContainer = styled.div`
  min-height: calc(100vh - 4rem);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
`;

const RegisterPage: React.FC = () => {
  return (
    <RegisterContainer>
      <h1>Register Page - Coming Soon</h1>
    </RegisterContainer>
  );
};

export default RegisterPage;