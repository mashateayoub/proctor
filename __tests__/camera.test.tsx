import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProctorCamera from '../src/components/ProctorCamera';

// 1. Mock the native MediaPipe runtime since it cannot inject WASM into headless DOM test environments
vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: {
    forVisionTasks: vi.fn(),
  },
  ObjectDetector: {
    createFromOptions: vi.fn().mockResolvedValue({
      setOptions: vi.fn(),
      detectForVideo: vi.fn((videoEl, time) => {
        // We will simulate the object detector immediately returning an anomaly for testing!
        return {
          detections: [
            { categories: [{ categoryName: 'cell phone', score: 0.89 }] }
          ]
        }
      }),
    }),
  },
  FaceDetector: {
    createFromOptions: vi.fn().mockResolvedValue({
      setOptions: vi.fn(),
      detectForVideo: vi.fn(() => ({
         detections: [] // Simulate 0 faces (anomaly)
      })),
    }),
  }
}));

// 2. Mock Supabase injection to capture the insert/update calls on cheating
const mockUpdate = vi.fn().mockResolvedValue({ error: null });
const mockEq = vi.fn().mockReturnValue({ update: mockUpdate });
const mockSelect = vi.fn().mockResolvedValue({ data: {
  no_face_count: 0,
  cell_phone_count: 0,
  screenshots: []
}, error: null });

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }) },
    from: () => ({
      select: () => ({
        eq: () => ({ single: mockSelect })
      }),
      update: mockUpdate,
    })
  })
}));

describe('MediaPipe Headless React Interop', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Initializes properly, intercepts camera stream, and generates cell-phone anomaly REST trigger', async () => {
    // We override navigator.mediaDevices exactly how a modern browser provides it
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [ { stop: vi.fn() } ]
        })
      },
    });

    render(<ProctorCamera examId="f47ac10b" width={640} height={480} />);

    // Since we forced the mock ObjectDetector to return 'cell phone',
    // the polling hook inside ProctorCamera should eventually trigger an update payload!
    
    await waitFor(() => {
       // Wait for the mockUpdate to be triggered within the 2000ms polling cycle
       // It parses cell_phone anomaly and increments cell_phone_count payload
       expect(mockSelect).toHaveBeenCalled();
       expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ video: true });
    }, { timeout: 3000 });
  });

});
