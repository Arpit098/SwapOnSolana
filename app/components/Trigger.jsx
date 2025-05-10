// TriggerContext.js
import { createContext, useContext, useState } from 'react';

// Create a Context for the Trigger
const TriggerContext = createContext();

export const TriggerProvider = ({ children }) => {
  const [trigger, setTrigger] = useState(true); // Initialize Trigger as true

  return (
    <TriggerContext.Provider value={{ trigger, setTrigger }}>
      {children}
    </TriggerContext.Provider>
  );
};

// Custom hook to use the Trigger context
export const useTrigger = () => useContext(TriggerContext);