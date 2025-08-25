# Implementation Plan

- [x] 1. Setup Shadcn/ui and Design System Foundation

  - Install and configure Shadcn/ui components with Tailwind CSS
  - Setup design tokens and base styling configuration
  - Install Lucide React for consistent iconography
  - Create base layout structure with clean, minimal design
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 2. Implement Enhanced State Management
- [x] 2.1 Create Optimistic State Manager

  - Build OptimisticStateManager class with comment and vote operations
  - Implement temporary ID generation and state tracking
  - Create rollback mechanisms for failed operations
  - Add state persistence and recovery logic
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2.2 Enhance usePins Hook with Optimistic Updates

  - Modify addComment function to use optimistic updates
  - Modify voteComment function to use optimistic updates
  - Implement immediate UI feedback without loading states
  - Add error handling and rollback functionality
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 3. Implement Smart Cache Management
- [ ] 3.1 Create Enhanced Cache Manager

  - Extend SimpleMapCache with granular update operations
  - Implement cache invalidation strategies for pins and comments
  - Add LRU eviction and memory management
  - Create cache persistence to localStorage
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 7.2, 7.3, 7.4_

- [ ] 3.2 Integrate Cache with State Management

  - Connect cache manager with optimistic state updates
  - Implement cache invalidation on pin/comment operations
  - Add cache warming strategies for better performance
  - Create cache debugging and monitoring tools
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 7.2, 7.3, 7.4_

- [ ] 4. Implement Comment Sorting and Enhanced Display
- [ ] 4.1 Create Comment Sort Manager

  - Build CommentSortManager with multiple sorting strategies
  - Implement sorting by newest, oldest, most liked, and net score
  - Calculate like/dislike counts and net scores accurately
  - Create sort option UI with dropdown selection
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 4.2 Update Comment Display Components

  - Enhance CommentItem to show accurate vote counts and net scores
  - Remove emoji usage and implement clean, minimal design
  - Add sorting controls to PinDetailModal
  - Implement real-time sorting without API calls
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 5. Implement Auto Pin Cleanup System
- [ ] 5.1 Create Pin Cleanup Service

  - Build deleteCommentWithCleanup function in pin service
  - Implement logic to check remaining comments after deletion
  - Add automatic pin deletion when no comments remain
  - Create cleanup validation and safety checks
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 5.2 Integrate Cleanup with UI Components

  - Update CommentItem delete functionality to use cleanup service
  - Add UI feedback for pin deletion events
  - Implement cache updates for deleted pins
  - Handle edge cases and error scenarios
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 6. Implement Search Functionality
- [ ] 6.1 Create Search Manager and API

  - Build SearchManager class with pin search capabilities
  - Implement backend search by pin name functionality
  - Add search result highlighting on map
  - Create search state management and caching
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 6.2 Build Search UI Components

  - Create search input component in header using Shadcn/ui
  - Implement search results display and navigation
  - Add search history and suggestions
  - Create clear search and reset functionality
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 7. Convert UI to English and Update Branding
- [x] 7.1 Update All Component Text to English

  - Convert PinDetailModal text from Turkish to English
  - Convert CommentItem text from Turkish to English
  - Update PinModal and all form labels to English
  - Convert Header and navigation elements to English
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 7.2 Update App Branding to oPINion

  - Change app name display to "oPINion" throughout interface
  - Update page titles and meta tags
  - Update header branding and logo area
  - Ensure consistent branding across all components
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 8. Redesign Components with Shadcn/ui
- [x] 8.1 Redesign Modal Components

  - Replace PinDetailModal styling with Shadcn/ui Dialog
  - Replace PinModal styling with clean, minimal design
  - Remove gradients, emojis, and decorative elements
  - Implement consistent spacing and typography
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 8.2 Redesign Form and Interactive Components

  - Replace custom buttons with Shadcn/ui Button variants
  - Replace input fields with Shadcn/ui Input components
  - Redesign vote buttons with clean, minimal styling
  - Implement consistent hover and focus states
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 8.3 Redesign Header and Navigation

  - Create clean header with oPINion branding
  - Implement search input with proper styling
  - Add user authentication status display
  - Remove decorative elements and focus on functionality
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 9. Implement Error Handling and Notifications
- [ ] 9.1 Create Toast Notification System

  - Implement Toast component using Shadcn/ui
  - Create ErrorNotificationManager for centralized error handling
  - Add success, warning, and error notification types
  - Implement retry actions for failed operations
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 9.2 Integrate Error Handling with Optimistic Updates

  - Add error handling to optimistic comment additions
  - Add error handling to optimistic vote operations
  - Implement graceful rollback with user notifications
  - Add network error detection and retry mechanisms
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 10. Performance Optimizations and Final Integration
- [ ] 10.1 Implement Performance Optimizations

  - Add debounced cache updates to reduce re-renders
  - Implement lazy loading for comment lists
  - Add memory management for optimistic states
  - Optimize network calls with batching where possible
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 10.2 Final Integration and Testing
  - Integrate all components with new state management
  - Test optimistic updates across all user flows
  - Verify cache consistency and performance
  - Test search functionality and pin cleanup
  - Ensure all UI text is in English with oPINion branding
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 7.4_
