'use strict';

import React, { Component } from 'react';
import { Link, browserHistory } from 'react-router';

import { graphql } from 'react-apollo';
import UpdateListMutation from 'app/graphql/mutations/lists/Update';

import update from 'immutability-helper';
import _  from 'lodash';

import { Modal, Icon, Row, Col, Form, Input, InputNumber, Button, Spin, Card, message } from 'antd';
const FormItem = Form.Item;

import ModalHeader from 'app/components/productivity/modal/Header';
import ColorPicker from 'app/components/common/ColorPicker';


class List extends Component {

	constructor(props) {
		super(props);
		this.state = {
			processing: false,
		}
		this.handleCancel = this.handleCancel.bind(this);
		this.handleFormSubmit = this.handleFormSubmit.bind(this);
		this.resetForm = this.resetForm.bind(this);
		this.resetBackground = this.resetBackground.bind(this);
	}


	handleCancel() {
		browserHistory.push(`/boards/${this.props.params.id}`);
	}

	resetForm() {
		this.props.form.resetFields();
	}

	resetBackground(e, list, board) {
		if ( ! list.meta.background_color ) {
			return message.info("You haven't set any background color yet.");
		}
		this.props.form.setFieldsValue({
			'meta.background_color': null,
		});
		return this.handleFormSubmit(e, list, board)
	}


	handleFormSubmit(e, list, board) {
		e.preventDefault();
		this.props.form.validateFields( (err, fields) => {
			if ( ! err ) {
				if (
					fields.description === list.description &&
					fields.title === list.title &&
					fields.meta.background_color == list.meta.background_color &&
					fields.meta.space_before == list.meta.space_before &&
					fields.meta.space_after == list.meta.space_after
				) {
					return message.warning('You haven\'t made any changes yet.');
				}

				this.setState({ processing: true });
				const loading_message = message.loading('Updating list details..', 0);

				this.props.mutate({
					variables: {
						id: list.id,
						title: fields.title,
						description: fields.description,
						meta: {
							background_color: fields.meta.background_color,
							space_before: fields.meta.space_before || null,
							space_after: fields.meta.space_after || null,
						}
					},
					optimisticResponse: {
						__typename: 'Mutation',
						updateList: {
							__typename: 'List',
							id: list.id,
							title: fields.title,
							description: fields.description,
							meta: {
								background_color: fields.meta.background_color,
								space_before: fields.meta.space_before,
								space_after: fields.meta.space_after,
							}
						},
					},
					updateQueries: {
						BoardQuery: (previousResult, { mutationResult }) => {
							const updatedList = mutationResult.data.updateList;
							const listIndex = _.findIndex( previousResult.board.lists, { id: list.id } );
							const updated = update(previousResult, {
								board: {
									lists: {
										[listIndex]: {
											title: { $set: updatedList.title },
											description: { $set: updatedList.description },
											meta: { $set: updatedList.meta },
										}
									}
								},
							});
							return updated;
						}
					},
				})
				.then( res => {
					this.setState({ processing: false });
					loading_message();
					message.success('List details has been successfully updated.');
				})
				.catch( res => {
					if ( res.graphQLErrors ) {
						const errors = res.graphQLErrors.map( error => error.message );
						console.log('errors',errors);
					}
				});

			}
		});
	}



	render() {


		const { board } = this.props.data;
		const list = _.find( this.props.data.board.lists, { id: this.props.params.list_id } );

		if ( ! list ) {
			setTimeout( () => {
				message.error("The list you're looking for doesn't exist or your dont have permissions to access it.");
				this.handleCancel();
			}, 50);
			return <div></div>;
		}

		const { getFieldDecorator } = this.props.form;



		return (
			<Modal
				wrapClassName="modal__primary"
				visible={ true }
				maskClosable={ false }
				onCancel={ this.handleCancel }
				footer={[]}
			>

				<ModalHeader
					title={ <div><span>List:</span> {list.title}</div> }
					subtitle="Enter the list details below and click on update."
					editable={ false }
				/>

				<div className="container">
				<div className="content full">

					<Form layout="vertical" onSubmit={ (e) => { this.handleFormSubmit(e, list, board ) } }>

						<Spin spinning={ this.state.processing } size="large">
							<FormItem label="List Title" hasFeedback>
								{ getFieldDecorator('title', {
									rules: [{ required: true, message: 'Please enter List Title' }],
									initialValue: list.title,
								})(
									<Input placeholder="List Title" autoComplete="off" autoFocus />
								) }
							</FormItem>
							<FormItem label="List Description" hasFeedback >
								{ getFieldDecorator('description', {
									initialValue: list.description,
								})(
									<Input type="textarea" placeholder="List description" autosize={{ minRows: 3, maxRows: 6 }} />
								) }
							</FormItem>

							<Input.Group>
							<Row>

								<Col span="12">
									<FormItem label="List Background" >
										{ getFieldDecorator('meta.background_color', {
											initialValue: list.meta.background_color || null,
										})(
											<ColorPicker />
										) }
									</FormItem>
								</Col>

								<Col span="5" offset="1">
									<FormItem label="Space Before" >
										{ getFieldDecorator('meta.space_before', {
											initialValue: list.meta.space_before || null,
										})(
											<InputNumber min={1} max={10} placeholder="Example: 1" style={{ width: '100%' }} />
										) }
									</FormItem>
								</Col>

								<Col span="5" offset="1">
									<FormItem label="Space After" >
										{ getFieldDecorator('meta.space_after', {
											initialValue: list.meta.space_after || null,
										})(
											<InputNumber min={1} max={10} placeholder="Example: 1" style={{ width: '100%' }} />
										) }
									</FormItem>
								</Col>

							</Row>
							</Input.Group>

							<FormItem className="m-b-0">
								<Button type="primary" size="default" icon="check" htmlType="submit">Update Details</Button>
								<Button type="ghost" size="default" icon="reload" onClick={ this.resetForm } className="m-l-10">Reset</Button>
								{ list.meta.background_color &&
									<Button type="ghost" size="default" icon="reload" onClick={ (e) => { this.resetBackground(e, list, board ) } } className="float-right">Reset Background</Button>
								}
							</FormItem>
						</Spin>

					</Form>

				</div>
				</div>

			</Modal>
		);

	}


}


List = Form.create()(List);
export default graphql(UpdateListMutation)(List);
