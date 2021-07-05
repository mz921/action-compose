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

		actionCompose({
			executor: fn1,
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
		})(123,456);

		expect(fn2.mock.calls[0][0]).toEqual({
			initialValue: [123, 456],
			returnValue: 123456,
		});
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
			})(123)
		).toBe(123456);
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
                            executor: syncFn1
                        }
                    ]
                }
            ]
        })().then(() => {
            expect(resolvedAsyncFn1.mock.calls.length).toBe(1);
			expect(resolvedAsyncFn2.mock.calls.length).toBe(0);
			expect(syncFn1.mock.calls.length).toBe(0);
        })
    });

    test('inject args', () => {
       const p1 = actionCompose({
           executor: resolvedAsyncFn1,
           next: [
               {
                   executor: syncFn1,
                   inject: {
                       initialValue: true,
                       returnValue: true
                   }
               }
           ]
       })(777,888)
       const p2 = actionCompose({
           executor: rejectAsyncFn1,
           next: [
               {
                   executor: syncFn1,
                   inject: {
                       initialValue: true,
                       returnValue: true
                   }
               }
           ]
       })(777, 888)

       return Promise.all([p1, p2]).then(() => {
            expect(syncFn1.mock.calls[0][0]).toEqual({
                initialValue: [777, 888],
                returnValue: 111
            })
            expect(syncFn1.mock.calls[1][0]).toEqual({
                initialValue: [777,888],
                returnValue: 333
            })
       })
    })

    test('return value', () => {
        const p1 = actionCompose({
            executor: resolvedAsyncFn1,
            next: [
                {
                    executor: syncFn1,
                    when: () => false
                },
                {
                executor: resolvedAsyncFn2
            }]
        })().then((ret: any) => expect(ret).toBe(222))

        const p2 = actionCompose({
            executor: resolvedAsyncFn1,
            next: [
                {
                    executor: syncFn1,
                    when: () => false
                },
                {
                    executor: rejectAsyncFn1
                }
            ]
        })().catch((ret: any) => expect(ret).toBe(333))

        const p3 = actionCompose({
            executor: rejectAsyncFn1,
            next: [{
                executor: syncFn1
            },
            {
                when: () => false,
                executor: resolvedAsyncFn1
            }
        ]
        })().then((ret: any) => expect(ret).toBe(444))

        const p4 = actionCompose({
            executor: resolvedAsyncFn1,
            next: [
                {
                    executor: syncFn1
                },
                {
                    when: () => false,
                    executor: rejectAsyncFn1
                }
            ]
        })().then((ret: any) => expect(ret).toBe(444))

        return Promise.allSettled([p1, p2, p3, p4])

    })
});
