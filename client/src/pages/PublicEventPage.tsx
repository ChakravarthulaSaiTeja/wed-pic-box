import React from 'react';
import styled from 'styled-components';

const PublicEventContainer = styled.div`
  min-height: calc(100vh - 4rem);
  padding: 2rem 1rem;
`;

const PublicEventPage: React.FC = () => {
  return (
    <PublicEventContainer>
      <h1>Public Event - Coming Soon</h1>
    </PublicEventContainer>
  );
};

export default PublicEventPage;