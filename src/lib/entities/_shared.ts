type Update<T> = Partial<{ [K in keyof T]: T[K] }>;
// apply-patch-anchor - do not delete