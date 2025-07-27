import React from 'react';
import styled from 'styled-components';

const DashboardContainer = styled.div`
  min-height: calc(100vh - 4rem);
  padding: 2rem 1rem;
`;

const DashboardPage: React.FC = () => {
  return (
    <DashboardContainer>
      <h1>Dashboard - Coming Soon</h1>
    </DashboardContainer>
  );
};

export default DashboardPage;