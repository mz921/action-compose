import actionCompose from '../src';

describe('sync', () => {
	test('basic calling chain', () => {
		const fn1 = jest.fn();
		const fn2 = jest.fn();
		actionCompose({
			executor: fn1,
			next: [
				{
					executor: fn2,
				},
			],
		})();
		expect(fn1.mock.calls.length).toBe(1);
		expect(fn2.mock.calls.length).toBe(1);
	});

	test('when', () => {
		const fn1 = jest.fn();
		const fn2 = jest.fn();
		const fn3 = jest.fn();
		actionCompose({
			executor: fn1,
			next: [
				{
					executor: fn2,
					when: () => false,
				},
				{
					executor: fn3,
				},
			],
		})();
		expect(fn1.mock.calls.length).toBe(1);
		expect(fn2.mock.calls.length).toBe(0);
		expect(fn3.mock.calls.length).toBe(1);
	});

	test('inject args', () => {
		const fn1 = jest.fn();
		const fn2 = jest.fn();
		const fn3 = jest.fn();

		fn1.mockReturnValue(123456);
		fn2.mockReturnValue(789);

		actionCompose({
			executor: fn1,
            returnValueKey: "someReturnValue",
			next: [
				{
					executor: fn3,
					when: () => false,
				},
				{
					executor: fn2,
					inject: {
						initialValue: true,
						returnValue: true,
					},
				},
			],
		})({
            foo: 123,
            bar: 456
        });

		expect(fn2.mock.calls[0][0]).toEqual({
            foo: 123,
            bar: 456,
			someReturnValue: 123456,
		});

		actionCompose({
			executor: fn1,
			returnValueKey: "otherReturnValue", 
			next: [
				{
					executor: fn2,
					next: [
						{
							executor: fn3,
							inject: {
								returnValue: true
							}
						}
					]
				}
			]	
		})()

		expect(fn3.mock.calls[0][0]).toEqual({
			returnValue: 789
		})

	});

	test('return value', () => {
		const fn1 = jest.fn();
		const fn2 = jest.fn();
		const fn3 = jest.fn();

		fn2.mockReturnValue(123456);
		fn3.mockReturnValue(123);

		expect(
			actionCompose({
				executor: fn1,
				next: [
					{
						executor: fn2,
						inject: {
							initialValue: true,
							returnValue: true,
						},
					},
					{
						executor: fn3,
						when: () => false,
					},
				],
			})({
                foo: 123
            })
		).toBe(123456);
	});

	test('return value when all the conditions in next are failed', () => {
		const fn1 = jest.fn();
		const fn2 = jest.fn();

		fn1.mockReturnValue(111);
		fn2.mockReturnValue(222);

		expect(
			actionCompose({
				executor: fn1,
				next: [
					{
						executor: fn2,
						when: () => false,
					},
				],
			})()
		).toBe(111);
	});
});

let resolvedAsyncFn1: jest.Mock;
let resolvedAsyncFn2: jest.Mock;
let rejectAsyncFn1: jest.Mock;
let syncFn1: jest.Mock;

describe('async', () => {
	beforeEach(() => {
		resolvedAsyncFn1 = jest.fn().mockResolvedValue(111);
		resolvedAsyncFn2 = jest.fn().mockResolvedValue(222);
		rejectAsyncFn1 = jest.fn().mockRejectedValue(333);
		syncFn1 = jest.fn().mockReturnValue(444);

		// a trick for fixing jest mock async function's constructor name
		Object.defineProperty(resolvedAsyncFn1.constructor, 'name', {
			writable: true,
			value: 'AsyncFunction',
		});

		Object.defineProperty(resolvedAsyncFn2.constructor, 'name', {
			writable: true,
			value: 'AsyncFunction',
		});

		Object.defineProperty(rejectAsyncFn1.constructor, 'name', {
			writable: true,
			value: 'AsyncFunction',
		});
	});

	test('basic calling chain', async () => {
		return actionCompose({
			executor: resolvedAsyncFn1,
			next: [
				{
					executor: resolvedAsyncFn2,
					next: [
						{
							executor: syncFn1,
						},
					],
				},
			],
		})().then(() => {
			expect(resolvedAsyncFn1.mock.calls.length).toBe(1);
			expect(resolvedAsyncFn2.mock.calls.length).toBe(1);
			expect(syncFn1.mock.calls.length).toBe(1);
		});
	});

	test('when', async () => {
		return actionCompose({
			executor: resolvedAsyncFn1,
			next: [
				{
					when: () => false,
					executor: resolvedAsyncFn2,
					next: [
						{
							executor: syncFn1,
						},
					],
				},
			],
		})().then(() => {
			expect(resolvedAsyncFn1.mock.calls.length).toBe(1);
			expect(resolvedAsyncFn2.mock.calls.length).toBe(0);
			expect(syncFn1.mock.calls.length).toBe(0);
		});
	});

	test('inject args', () => {
		const p1 = actionCompose({
			executor: resolvedAsyncFn1,
            returnValueKey: "someReturnValue",
			next: [
				{
					executor: syncFn1,
					inject: {
						initialValue: true,
						returnValue: true,
					},
				},
			],
		})({
            foo: 777,
            bar: 888
        });
		const p2 = actionCompose({
			executor: rejectAsyncFn1,
			next: [
				{
					executor: syncFn1,
					inject: {
						initialValue: true,
						returnValue: true,
					},
				},
			],
		})({
            foo: 777,
            bar: 888
        });

		return Promise.all([p1, p2]).then(() => {
			expect(syncFn1.mock.calls[0][0]).toEqual({
				foo: 777,
                bar: 888,
				someReturnValue: 111,
			});
			expect(syncFn1.mock.calls[1][0]).toEqual({
                foo: 777,
                bar: 888,
				returnValue: 333,
			});
		});
	});

	test('return value', () => {
		const p1 = actionCompose({
			executor: resolvedAsyncFn1,
			next: [
				{
					executor: syncFn1,
					when: () => false,
				},
				{
					executor: resolvedAsyncFn2,
				},
			],
		})();

		const p2 = actionCompose({
			executor: resolvedAsyncFn1,
			next: [
				{
					executor: syncFn1,
					when: () => false,
				},
				{
					executor: rejectAsyncFn1,
				},
			],
		})();

		const p3 = actionCompose({
			executor: rejectAsyncFn1,
			next: [
				{
					executor: syncFn1,
				},
			],
		})();

		const p4 = actionCompose({
			executor: resolvedAsyncFn1,
			next: [
				{
					executor: syncFn1,
				},
				{
					when: () => false,
					executor: rejectAsyncFn1,
				},
			],
		})();

		return Promise.allSettled([p1, p2, p3, p4]).then(([ret1, ret2, ret3, ret4]) => {
			expect(ret1).toEqual({ status: 'fulfilled', value: 222 });
			expect(ret2).toEqual({ status: 'rejected', reason: 333 });
			expect(ret3).toEqual({ status: 'fulfilled', value: 444 });
			expect(ret4).toEqual({ status: 'fulfilled', value: 444 });
		});
	});

	test('return value when all the conditions in next are failed', () => {
		return actionCompose({
			executor: rejectAsyncFn1,
			next: [
				{
					executor: syncFn1,
					when: () => false,
				},
			],
		})().catch((ret: any) => expect(ret).toBe(333));
	});
});
