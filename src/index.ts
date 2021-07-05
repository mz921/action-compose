import compose from 'compose-function';

const isAsync = (func: Function) => func.constructor.name === 'AsyncFunction';

type Action = RootAction | NonRootAction;

type InjectArgsType = {
	initialValue?: boolean;
	returnValue?: boolean;
	promiseState?: boolean;
};

interface RootAction {
	executor: Function;
	next: NonRootAction[];
	isRoot: true;
}

interface NonRootAction {
	executor: Function;
	next?: NonRootAction[];
	inject?: InjectArgsType;
	when?: (...args: any[]) => boolean;
	injectWhen?: InjectArgsType;
}

function actionCompose(rootAction: Omit<RootAction, 'isRoot'>) {
	return (...initialValue: any[]) => {
		let returnValue: any;
		let promiseState: 'resolve' | 'reject';
		let finish = false;

		const assignReturnValue = (val: any) => (returnValue = val);
		const assignPromiseState = (state: 'resolve' | 'reject') => (promiseState = state);

		const createInjectArgs = (action: Action, type: 'inject' | 'injectWhen') => {
			if ('isRoot' in action)
				return {
					initialValue,
				};

			const injectArgs: { [k in keyof InjectArgsType]: any } = {};
			if (action[type]?.initialValue) {
				injectArgs.initialValue = initialValue;
			}
			if (action[type]?.returnValue) {
				injectArgs.returnValue = returnValue;
			}
			if (action[type]?.promiseState) {
				injectArgs.promiseState = promiseState;
			}
			return injectArgs;
		};

		const whenPass = (action: Action) => {
			if ('when' in action && action.when !== undefined) {
				return action.when(createInjectArgs(action, 'injectWhen')) === true;
			}
			return true;
		};

		const isLeafAction = (action: Action) => {
			return !('next' in action) || action.next === undefined;
		};

		async function executeAsync(action: Action) {
			if (whenPass(action) === false) return;

			if (isLeafAction(action)) {
				finish = true;
				return action.executor(createInjectArgs(action, 'inject'));
			}

			const executorP = action.executor(createInjectArgs(action, 'inject'));

			await executorP
				.then(compose(assignPromiseState.bind(null, 'resolve'), assignReturnValue))
				.catch(compose(assignPromiseState.bind(null, 'reject'), assignReturnValue));

			let ret;

			for (let nextAction of action.next!) {
				if (finish === true) return ret;

				ret = await executorP.then(dispatch.bind(null, nextAction), dispatch.bind(null, nextAction));
			}
			// all when conditions in next are failed
			if (finish === false) {
				ret = executorP;
			}
			return ret;
		}

		function excuteSync(action: Action) {
			if (whenPass(action) === false) return;

			if (isLeafAction(action)) {
				finish = true;
				return action.executor(createInjectArgs(action, 'inject'));
			}

			const tmp = assignReturnValue(action.executor(createInjectArgs(action, 'inject')));

			let ret;

			for (let nextAction of action.next!) {
				if (finish === true) return ret;

				ret = dispatch(nextAction);
			}

			if (finish === false) ret = tmp;

			return ret;
		}

		function dispatch(action: Action): any {
			if (isAsync(action.executor)) {
				return executeAsync(action);
			} else {
				return excuteSync(action);
			}
		}

		return dispatch({ ...rootAction, isRoot: true });
	};
}

export default actionCompose;
