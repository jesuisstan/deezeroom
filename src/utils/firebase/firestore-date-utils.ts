/**
 * Utility function to convert Firestore Timestamp to Date
 */
export const parseFirestoreDate = (firestoreDate: any): Date => {
  if (!firestoreDate) {
    return new Date();
  }

  if (firestoreDate instanceof Date) {
    return firestoreDate;
  }

  // Firestore Timestamp has seconds and nanoseconds
  if (
    typeof firestoreDate === 'object' &&
    firestoreDate.seconds !== undefined
  ) {
    return new Date(firestoreDate.seconds * 1000);
  }

  // Firestore Timestamp may also have a toDate() method
  if (
    typeof firestoreDate === 'object' &&
    typeof firestoreDate.toDate === 'function'
  ) {
    return firestoreDate.toDate();
  }

  // String date
  if (typeof firestoreDate === 'string') {
    return new Date(firestoreDate);
  }

  // Number (milliseconds timestamp)
  if (typeof firestoreDate === 'number') {
    return new Date(firestoreDate);
  }

  console.warn('Unknown date format:', firestoreDate);
  return new Date(); // fallback to current date
};
