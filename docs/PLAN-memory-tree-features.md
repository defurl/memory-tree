# Project Plan: Shared Memory Uploads & Extended Gestures

## Context

The user wants to enhance the `memory-tree-standalone` with two key features:

1. **Shared Uploads**: Users can upload images/titles to the tree, visible to **everyone**. This requires a cloud backend (Supabase recommended for ease/speed).
2. **Advanced Gestures**:
    - **1 Finger**: Vertical Scroll (traversing the tree height).
    - **2 Fingers (Pinch)**: Select/Pick an image.
    - **5 Fingers**: Global Rotate & Zoom.

## Phase 1: Backend Infrastructure (Supabase)

To share images between users, we cannot use LocalStorage. We need a cloud database.

- [ ] **Setup Supabase Project**
  - Database Table: `memories` (id, image_url, title, position, timestamp).
  - Storage Bucket: `memory-images`.
- [ ] **Connect Frontend**
  - Install `@supabase/supabase-js`.
  - Create `src/lib/supabase.ts` client.
- [ ] **Data Fetching Hook**
  - Create `useTreeMemories` to fetch/subscribe to real-time updates.

## Phase 2: Upload Feature

- [ ] **Upload UI Component**
  - Simple modal/overlay triggered by UI button (or gesture?).
  - File picker & Title input.
- [ ] **Upload Logic**
  - Resize/Compress image (client-side).
  - Upload to Supabase Storage.
  - Insert record into `memories` table.

## Phase 3: Gesture Engine & Camera Control

Refactor `useHandTracking.ts` to support distinct modes.

- [ ] **Gesture State Machine**
  - **Idle**: No hands or undefined state.
  - **Scroll Mode (1 Finger)**:
    - Detect single extended index finger.
    - Map Y-movement to Camera Y-position (Scroll tree height).
  - **Select Mode (2 Finger Pinch)**:
    - Detect Thumb + Index pinch.
    - Trigger `onSelect` for the memory node in focus.
  - **Manipulation Mode (5 Fingers)**:
    - Detect open palm (5 fingers).
    - Map X-movement to Tree Rotation.
    - Map Spread/Pinch to Camera Zoom (Distance).
- [ ] **Smoothing & Transitions**
  - Add extensive smoothing (Lerp) to prevent jittery camera jumps between modes.

## Phase 4: Integration

- [ ] **Connect Camera Rig**
  - Bind "Scroll Mode" to `OrbitControls` typeless target or custom camera rig.
- [ ] **Connect Selection**
  - Highlight memory nodes when hovering in Scroll Mode.
  - Open Memory Detail on Select Mode (Pinch).

## Verification Plan

- [ ] **Upload Test**: Upload image from Browser A, verify it appears on Browser B.
- [ ] **Gesture Test**:
  - 1 Finger moves camera up/down.
  - 5 Fingers rotates tree.
  - 2 Fingers selects item.
