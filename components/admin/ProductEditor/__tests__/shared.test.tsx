import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { ValidationFeedback } from '../shared/ValidationFeedback';
import { Settings } from 'lucide-react';

describe('CollapsibleSection', () => {
  it('renders title and description', () => {
    render(
      <CollapsibleSection
        title="Settings"
        description="Configure settings"
        isOpen={false}
      >
        <div>Content</div>
      </CollapsibleSection>,
    );
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Configure settings')).toBeInTheDocument();
  });

  it('hides content when closed', () => {
    render(
      <CollapsibleSection title="Settings" isOpen={false}>
        <div>Content</div>
      </CollapsibleSection>,
    );
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('shows content when open', () => {
    render(
      <CollapsibleSection title="Settings" isOpen={true}>
        <div>Content</div>
      </CollapsibleSection>,
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('displays error message', () => {
    render(
      <CollapsibleSection
        title="Settings"
        isOpen={true}
        validationStatus="error"
        error="This field is required"
      >
        <div>Content</div>
      </CollapsibleSection>,
    );
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    const { container } = render(
      <CollapsibleSection
        title="Settings"
        icon={Settings}
        isOpen={false}
      >
        <div>Content</div>
      </CollapsibleSection>,
    );
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});

describe('ValidationFeedback', () => {
  it('component exists and exports correctly', () => {
    expect(ValidationFeedback).toBeDefined();
    expect(typeof ValidationFeedback).toBe('function');
  });
});
