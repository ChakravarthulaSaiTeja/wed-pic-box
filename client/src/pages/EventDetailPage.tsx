import React from 'react';
import styled from 'styled-components';

const EventDetailContainer = styled.div`
  min-height: calc(100vh - 4rem);
  padding: 2rem 1rem;
`;

const EventDetailPage: React.FC = () => {
  return (
    <EventDetailContainer>
      <h1>Event Detail - Coming Soon</h1>
    </EventDetailContainer>
  );
};

export default EventDetailPage;