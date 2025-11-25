import * as Sentry from '@sentry/react';

// Add this button component to your app to test Sentry's error tracking
export function ErrorButton() {
  return (
    <button
      onClick={() => {
        // Send a log before throwing the error
        Sentry.logger.info('User triggered test error', {
          action: 'test_error_button_click',
        });

        // Send a test metric before throwing the error
        Sentry.metrics.count('test_counter', 1);

        throw new Error('This is your first error!');
      }}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      Break the world
    </button>
  );
}

