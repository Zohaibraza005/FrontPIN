import React, { createContext, useContext, useState } from 'react';
import Joyride, { CallBackProps, Step, STATUS } from 'react-joyride';

interface TourContextType {
  startTour: () => void;
  stopTour: () => void;
  runTour: boolean;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

const tourSteps: Step[] = [
  {
    target: '.tour-dashboard',
    content: 'Welcome to FRONTPIN! This is your dashboard where you can see an overview of all important metrics.',
    disableBeacon: true,
  },
  {
    target: '.tour-sidebar',
    content: 'Use the sidebar to navigate between different modules like Attendance, Projects, Tasks, and more.',
  },
  {
    target: '.tour-notifications',
    content: 'Stay updated with real-time notifications about leave requests, project updates, and more.',
  },
  {
    target: '.tour-profile',
    content: 'Access your profile settings and logout from here.',
  },
  {
    target: '.tour-filters',
    content: 'Use filters to quickly find specific data across all modules.',
  },
];

export const TourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [runTour, setRunTour] = useState(false);

  const startTour = () => {
    setRunTour(true);
  };

  const stopTour = () => {
    setRunTour(false);
  };

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRunTour(false);
    }
  };

  return (
    <TourContext.Provider value={{ startTour, stopTour, runTour }}>
      {children}
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous
        showProgress
        showSkipButton
        callback={handleJoyrideCallback}
        styles={{
          options: {
            primaryColor: '#3b82f6',
            zIndex: 10000,
          },
        }}
      />
    </TourContext.Provider>
  );
};

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within TourProvider');
  }
  return context;
};
