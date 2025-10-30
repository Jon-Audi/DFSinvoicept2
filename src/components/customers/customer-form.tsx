
"use client";

import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Customer, CustomerType, EmailContactType, EmailContact, SpecificMarkup } from '@/types';
import { CUSTOMER_TYPES, EMAIL_CONTACT_TYPES, ALL_CATEGORIES_MARKUP_KEY } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Icon } from '@/components/icons';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '../ui/separator';

const emailContactSchema = z.object({
  id: z.string().optional(),
  type: z.enum(EMAIL_CONTACT_TYPES as [EmailContactType, ...EmailContactType[]]),
  name: z.string().optional(),
  email: z.string().email("Invalid email address"),
});

const specificMarkupSchema = z.object({
  id: z.string().optional(),
  categoryName: z.string().min(1, 'Category must be selected'),
  markupPercentage: z.coerce.number().min(0, 'Markup must be non-negative'),
});

const customerFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  companyName: z.string().optional(),
  customerType: z.enum(CUSTOMER_TYPES as [CustomerType, ...CustomerType[]]),
  phone: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
  }).optional(),
  emailContacts: z.array(emailContactSchema).optional(),
  notes: z.string().optional(),
  specificMarkups: z.array(specificMarkupSchema).optional(),
});

export type CustomerFormData = z.infer<typeof customerFormSchema>;

interface CustomerFormProps {
  customer?: Customer;
  onSubmit: (data: CustomerFormData) => void;
  onClose?: () => void;
}

export function CustomerForm({ customer, onSubmit, onClose }: CustomerFormProps) {
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: customer ? {
      ...customer,
      address: customer.address || {},
      emailContacts: customer.emailContacts || [],
      specificMarkups: customer.specificMarkups || [],
    } : {
      firstName: '',
      lastName: '',
      companyName: '',
      customerType: 'Fence Contractor',
      phone: '',
      address: { street: '', city: '', state: '', zip: '' },
      emailContacts: [],
      notes: '',
      specificMarkups: [],
    },
  });

  const { fields: emailFields, append: appendEmail, remove: removeEmail } = useFieldArray({
    control: form.control,
    name: "emailContacts",
  });

  const { fields: markupFields, append: appendMarkup, remove: removeMarkup } = useFieldArray({
    control: form.control,
    name: "specificMarkups",
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="firstName" render={({ field }) => (
            <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="lastName" render={({ field }) => (
            <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="companyName" render={({ field }) => (
          <FormItem><FormLabel>Company Name (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="customerType" render={({ field }) => (
            <FormItem><FormLabel>Customer Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                <SelectContent>{CUSTOMER_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
              </Select><FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>

        <Separator />
        <h3 className="text-lg font-medium">Email Contacts</h3>
        {emailFields.map((field, index) => (
          <div key={field.id} className="grid grid-cols-[1fr,1fr,1fr,auto] gap-2 items-end">
            <FormField control={form.control} name={`emailContacts.${index}.type`} render={({ field: typeField }) => (
              <FormItem><FormLabel>Type</FormLabel>
                <Select onValueChange={typeField.onChange} defaultValue={typeField.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>{EMAIL_CONTACT_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                </Select><FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name={`emailContacts.${index}.name`} render={({ field: nameField }) => (
              <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...nameField} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name={`emailContacts.${index}.email`} render={({ field: emailField }) => (
              <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...emailField} /></FormControl><FormMessage /></FormItem>
            )} />
            <Button type="button" variant="ghost" size="icon" onClick={() => removeEmail(index)}><Icon name="Trash2" className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => appendEmail({ type: 'Main Contact', name: '', email: '' })}>
          <Icon name="PlusCircle" className="mr-2 h-4 w-4" /> Add Email Contact
        </Button>

        <Separator />
        <h3 className="text-lg font-medium">Specific Markups</h3>
        {markupFields.map((field, index) => (
          <div key={field.id} className="grid grid-cols-[2fr,1fr,auto] gap-2 items-end">
             <FormField control={form.control} name={`specificMarkups.${index}.categoryName`} render={({ field: categoryNameField }) => (
              <FormItem><FormLabel>Category</FormLabel><FormControl><Input {...categoryNameField} /></FormControl><FormMessage /></FormItem>
            )} />
             <FormField control={form.control} name={`specificMarkups.${index}.markupPercentage`} render={({ field: markupPercentageField }) => (
              <FormItem><FormLabel>Markup (%)</FormLabel><FormControl><Input type="number" {...markupPercentageField} /></FormControl><FormMessage /></FormItem>
            )} />
            <Button type="button" variant="ghost" size="icon" onClick={() => removeMarkup(index)}><Icon name="Trash2" className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => appendMarkup({ categoryName: '', markupPercentage: 0 })}>
          <Icon name="PlusCircle" className="mr-2 h-4 w-4" /> Add Markup Rule
        </Button>

        <div className="flex justify-end gap-2 pt-4">
          {onClose && <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>}
          <Button type="submit">{customer ? 'Save Changes' : 'Create Customer'}</Button>
        </div>
      </form>
    </Form>
  );
}
