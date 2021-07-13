import actionCompose from '../src/index'

const RequestFailedAction = {
	executor: () => console.log("request failed"),
	when: ({promiseState}) => promiseState === 'reject',
	injectWhen: {
		promiseState: true
	}
}

const DeleteFailedAction = {
	executor: () => console.log("request successfully, but delete failed"),
	when: ({promiseState, response}) => promiseState === 'resolve' && response.result_code !== 0,
	injectWhen: {
		promiseState: true,
		returnValue: true
	}
}

const DeleteSuccessAction = {
	executor: () => console.log("delete successfully"),
	when: ({promiseState, response}) => promiseState === 'resolve' && response.result_code === 0,
	injectWhen: {
		promiseState: true,
		returnValue: true
	},
	next: [
		{
			executor: HttpClient.get
		}
	]
}

const DeleteDataAction = {
	executor: HttpClient.delete,
    returnValueKey: 'response',
	next: [
		RequestFailedAction,
		DeleteFailedAction,
		DeleteSuccessAction
	]
}

const deleteData = actionCompose(DeleteDataAction)